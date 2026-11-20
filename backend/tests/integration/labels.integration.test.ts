import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('labels integration', () => {
  let app: Express;
  let prisma: typeof import('../../src/shared/db/prisma.client').prisma;
  let mediumPriorityId: number;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
    const mediumPriority = await prisma.priorityLevel.findUniqueOrThrow({
      where: { name: 'medium' },
      select: { id: true },
    });
    mediumPriorityId = mediumPriority.id;
  });

  afterEach(async () => {
    if (testSupabase) {
      await deleteIntegrationAccounts(testSupabase);
    }
  });

  async function createAccount(): Promise<IntegrationAccount> {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    return loginAs(app, testSupabase);
  }

  async function apiRequest(
    method: string,
    path: string,
    token?: string,
    body?: unknown
  ): Promise<TestResponse> {
    return request(app, path, {
      method,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body }),
    });
  }

  function labelId(body: unknown): number {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'number'
    ) {
      throw new Error('Expected label response to include a numeric id');
    }
    return body.id;
  }

  it('creates, validates, scopes, updates, and deduplicates labels by user', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();

    for (const body of [
      { name: '' },
      { name: 'n'.repeat(51) },
      { name: 'Invalid color', color: 'blue' },
      { name: 'Invalid color', color: '#12345' },
    ]) {
      const invalid = await apiRequest(
        'POST',
        '/api/labels',
        account.token,
        body
      );
      expect(invalid.status).toBe(400);
    }

    const created = await apiRequest('POST', '/api/labels', account.token, {
      name: 'Personal',
      color: '#A1b2C3',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Personal',
      color: '#A1b2C3',
    });
    const id = labelId(created.body);

    const duplicate = await apiRequest('POST', '/api/labels', account.token, {
      name: 'Personal',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ code: 'label-name-taken' });

    const otherUserLabel = await apiRequest(
      'POST',
      '/api/labels',
      otherAccount.token,
      { name: 'Personal' }
    );
    expect(otherUserLabel.status).toBe(201);

    const ownLabels = await apiRequest('GET', '/api/labels', account.token);
    expect(ownLabels.status).toBe(200);
    expect(ownLabels.body).toMatchObject([
      { id, name: 'Personal', color: '#A1b2C3' },
    ]);
    expect(Array.isArray(ownLabels.body) ? ownLabels.body : []).toHaveLength(1);

    const invalidUpdate = await apiRequest(
      'PUT',
      `/api/labels/${id}`,
      account.token,
      { color: 'not-a-color' }
    );
    expect(invalidUpdate.status).toBe(400);

    const updated = await apiRequest(
      'PUT',
      `/api/labels/${id}`,
      account.token,
      { name: 'Updated personal', color: '#abcdef' }
    );
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id,
      name: 'Updated personal',
      color: '#abcdef',
    });
    expect(
      await prisma.label.findUniqueOrThrow({ where: { id } })
    ).toMatchObject({
      userId: account.id,
      name: 'Updated personal',
      color: '#abcdef',
    });
  });

  it('lists labels with task counts in sort order and persists a complete reorder', async () => {
    const account = await createAccount();
    const createdLabels = [];
    for (const name of [
      'First reorder label',
      'Second reorder label',
      'Third reorder label',
    ]) {
      const response = await apiRequest('POST', '/api/labels', account.token, {
        name,
      });
      expect(response.status).toBe(201);
      createdLabels.push({ id: labelId(response.body), name });
    }

    await Promise.all([
      prisma.label.update({
        where: { id: createdLabels[0].id },
        data: { sortOrder: 20 },
      }),
      prisma.label.update({
        where: { id: createdLabels[1].id },
        data: { sortOrder: 30 },
      }),
      prisma.label.update({
        where: { id: createdLabels[2].id },
        data: { sortOrder: 10 },
      }),
    ]);

    const project = await prisma.project.create({
      data: { userId: account.id, name: 'Label order task project' },
    });
    const tasks = await Promise.all(
      ['First count task', 'Second count task'].map((title) =>
        prisma.task.create({
          data: {
            userId: account.id,
            projectId: project.id,
            priorityId: mediumPriorityId,
            title,
          },
        })
      )
    );
    await prisma.taskLabel.createMany({
      data: [
        { taskId: tasks[0].id, labelId: createdLabels[0].id },
        { taskId: tasks[1].id, labelId: createdLabels[0].id },
        { taskId: tasks[0].id, labelId: createdLabels[1].id },
      ],
    });

    const initial = await apiRequest('GET', '/api/labels', account.token);
    expect(initial.status).toBe(200);
    expect(initial.body).toMatchObject([
      { id: createdLabels[2].id, sortOrder: 10, taskCount: 0 },
      { id: createdLabels[0].id, sortOrder: 20, taskCount: 2 },
      { id: createdLabels[1].id, sortOrder: 30, taskCount: 1 },
    ]);

    const reorderedIds = [
      createdLabels[1].id,
      createdLabels[2].id,
      createdLabels[0].id,
    ];
    const reorder = await apiRequest(
      'PUT',
      '/api/labels/reorder',
      account.token,
      { labelIds: reorderedIds }
    );
    expect(reorder.status).toBe(200);
    expect(reorder.body).toEqual({ labelIds: reorderedIds });

    const updatedList = await apiRequest('GET', '/api/labels', account.token);
    expect(updatedList.status).toBe(200);
    expect(updatedList.body).toMatchObject([
      { id: reorderedIds[0], sortOrder: 1, taskCount: 1 },
      { id: reorderedIds[1], sortOrder: 2, taskCount: 0 },
      { id: reorderedIds[2], sortOrder: 3, taskCount: 2 },
    ]);
    expect(
      (
        await prisma.label.findMany({
          where: { userId: account.id },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        })
      ).map(({ id }) => id)
    ).toEqual(reorderedIds);

    for (const labelIds of [
      reorderedIds.slice(1),
      [reorderedIds[0], reorderedIds[0], reorderedIds[2]],
    ]) {
      const invalid = await apiRequest(
        'PUT',
        '/api/labels/reorder',
        account.token,
        { labelIds }
      );
      expect(invalid.status).toBe(400);
    }
  });

  it('hides another user’s label and validates label ID params', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const foreign = await apiRequest(
      'POST',
      '/api/labels',
      otherAccount.token,
      { name: 'Private label' }
    );
    expect(foreign.status).toBe(201);
    const foreignId = labelId(foreign.body);

    for (const [method, path, body] of [
      ['GET', `/api/labels/${foreignId}`, undefined],
      ['PUT', `/api/labels/${foreignId}`, { name: 'Should not update' }],
      ['DELETE', `/api/labels/${foreignId}`, undefined],
    ] as const) {
      const response = await apiRequest(method, path, account.token, body);
      expect(response.status).toBe(404);
    }

    expect(
      (await apiRequest('GET', '/api/labels/not-a-number', account.token))
        .status
    ).toBe(400);
    expect(
      (
        await apiRequest('PUT', '/api/labels/not-a-number', account.token, {
          name: 'Invalid label ID',
        })
      ).status
    ).toBe(400);
  });

  it('deletes a label and its task links without deleting the task', async () => {
    const account = await createAccount();
    const project = await prisma.project.create({
      data: { userId: account.id, name: 'Label deletion project' },
    });
    const task = await prisma.task.create({
      data: {
        userId: account.id,
        projectId: project.id,
        priorityId: mediumPriorityId,
        title: 'Keep task after deleting label',
      },
    });
    const created = await apiRequest('POST', '/api/labels', account.token, {
      name: 'Delete with links',
    });
    expect(created.status).toBe(201);
    const id = labelId(created.body);

    const attached = await apiRequest(
      'POST',
      `/api/tasks/${task.id}/labels`,
      account.token,
      { labelIds: [id] }
    );
    expect(attached.status).toBe(200);
    expect(
      await prisma.taskLabel.count({
        where: { taskId: task.id, labelId: id },
      })
    ).toBe(1);

    const deleted = await apiRequest(
      'DELETE',
      `/api/labels/${id}`,
      account.token
    );
    expect(deleted.status).toBe(204);
    expect(await prisma.label.findUnique({ where: { id } })).toBeNull();
    expect(
      await prisma.taskLabel.count({
        where: { taskId: task.id, labelId: id },
      })
    ).toBe(0);
    expect(
      await prisma.task.findUnique({ where: { id: task.id } })
    ).not.toBeNull();
  });

  it('requires authentication for label CRUD routes', async () => {
    await createAccount();
    for (const [method, path, body] of [
      ['POST', '/api/labels', { name: 'Unauthorized' }],
      ['GET', '/api/labels', undefined],
      ['GET', '/api/labels/1', undefined],
      ['PUT', '/api/labels/1', { name: 'Unauthorized' }],
      ['DELETE', '/api/labels/1', undefined],
    ] as const) {
      const response = await apiRequest(method, path, undefined, body);
      expect(response.status).toBe(401);
    }
  });
});
