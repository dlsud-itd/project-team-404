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
