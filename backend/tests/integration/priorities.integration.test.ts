import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  registerAndLoginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('priorities integration', () => {
  let app: Express;
  let prisma: typeof import('../../src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
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

  function id(body: unknown): number {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'number'
    ) {
      throw new Error('Expected response to include a numeric id');
    }
    return body.id;
  }

  function ids(body: unknown): number[] {
    if (!Array.isArray(body)) {
      throw new Error('Expected response to be an array');
    }
    return body.map((item) => id(item));
  }

  async function listPriorities(token: string) {
    const response = await apiRequest('GET', '/api/priorities', token);
    expect(response.status).toBe(200);
    return response.body as Array<{
      id: number;
      name: string;
      color: string | null;
      sortOrder: number;
      isDefault: boolean;
      taskCount: number;
    }>;
  }

  it('provisions separate Low, Medium, and High priorities with Medium as default', async () => {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const account = await registerAndLoginAs(app);
    const otherAccount = await registerAndLoginAs(app);
    const priorities = await listPriorities(account.token);
    const otherPriorities = await listPriorities(otherAccount.token);

    expect(priorities.map(({ name }) => name.toLowerCase())).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(priorities.filter(({ isDefault }) => isDefault)).toHaveLength(1);
    expect(
      priorities.find(({ isDefault }) => isDefault)?.name.toLowerCase()
    ).toBe('medium');
    expect(otherPriorities.map(({ name }) => name.toLowerCase())).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(
      new Set(
        priorities
          .map(({ id }) => id)
          .filter((priorityId) =>
            otherPriorities.some((priority) => priority.id === priorityId)
          )
      ).size
    ).toBe(0);
    expect(
      await prisma.priorityLevel.count({
        where: { userId: account.id, deletedAt: null, isDefault: true },
      })
    ).toBe(1);
  });

  it('creates, reads, renames, recolors, and reorders priorities and scopes duplicate names by user', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const initial = await listPriorities(account.token);
    const customResponse = await apiRequest(
      'POST',
      '/api/priorities',
      account.token,
      { name: 'Urgent', color: '#123456' }
    );
    expect(customResponse.status).toBe(201);
    const customId = id(customResponse.body);
    expect(customResponse.body).toMatchObject({
      name: 'Urgent',
      color: '#123456',
      sortOrder: Math.max(...initial.map(({ sortOrder }) => sortOrder)) + 1,
      isDefault: false,
    });

    const read = await apiRequest(
      'GET',
      `/api/priorities/${customId}`,
      account.token
    );
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ id: customId, name: 'Urgent' });

    const updated = await apiRequest(
      'PUT',
      `/api/priorities/${customId}`,
      account.token,
      { name: 'Critical', color: '#abcdef' }
    );
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: customId,
      name: 'Critical',
      color: '#abcdef',
    });

    const duplicate = await apiRequest(
      'POST',
      '/api/priorities',
      account.token,
      { name: 'critical' }
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ code: 'priority-name-taken' });
    const otherDuplicate = await apiRequest(
      'POST',
      '/api/priorities',
      otherAccount.token,
      { name: 'CRITICAL' }
    );
    expect(otherDuplicate.status).toBe(201);

    const reorderedIds = [customId, ...initial.map(({ id: itemId }) => itemId)];
    const reordered = await apiRequest(
      'PUT',
      '/api/priorities/reorder',
      account.token,
      { priorityIds: reorderedIds }
    );
    expect(reordered.status).toBe(200);
    expect(ids(reordered.body)).toEqual(reorderedIds);
    expect(
      (await listPriorities(account.token)).map(({ id: itemId }) => itemId)
    ).toEqual(reorderedIds);
    expect(
      (
        await prisma.priorityLevel.findMany({
          where: { userId: account.id, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, sortOrder: true },
        })
      ).map(({ id: itemId, sortOrder }) => ({ id: itemId, sortOrder }))
    ).toEqual(
      reorderedIds.map((itemId, index) => ({
        id: itemId,
        sortOrder: index + 1,
      }))
    );

    for (const priorityIds of [
      reorderedIds.slice(1),
      [...reorderedIds.slice(0, -1), reorderedIds[0]],
      [...reorderedIds.slice(0, -1), id(otherDuplicate.body)],
    ]) {
      const invalid = await apiRequest(
        'PUT',
        '/api/priorities/reorder',
        account.token,
        { priorityIds }
      );
      expect(invalid.status).toBe(400);
    }
  });

  it('moves the default flag and keeps exactly one default priority', async () => {
    const account = await createAccount();
    const priorities = await listPriorities(account.token);
    const high = priorities.find(({ name }) => name.toLowerCase() === 'high');
    if (!high) throw new Error('Expected a High priority');

    const response = await apiRequest(
      'PUT',
      `/api/priorities/${high.id}/default`,
      account.token
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: high.id, isDefault: true });
    const updated = await listPriorities(account.token);
    expect(
      updated.filter(({ isDefault }) => isDefault).map(({ id }) => id)
    ).toEqual([high.id]);
    expect(
      await prisma.priorityLevel.count({
        where: { userId: account.id, deletedAt: null, isDefault: true },
      })
    ).toBe(1);
  });

  it('deletes unused and used priorities, reassigns tasks and defaults, and protects the last level', async () => {
    const account = await createAccount();
    const initial = await listPriorities(account.token);
    const low = initial.find(({ name }) => name.toLowerCase() === 'low');
    const medium = initial.find(({ name }) => name.toLowerCase() === 'medium');
    const high = initial.find(({ name }) => name.toLowerCase() === 'high');
    if (!low || !medium || !high) {
      throw new Error('Expected default Low, Medium, and High priorities');
    }

    const unusedResponse = await apiRequest(
      'POST',
      '/api/priorities',
      account.token,
      { name: 'Unused custom level' }
    );
    expect(unusedResponse.status).toBe(201);
    const unusedId = id(unusedResponse.body);
    const unusedDelete = await apiRequest(
      'DELETE',
      `/api/priorities/${unusedId}`,
      account.token
    );
    expect(unusedDelete.status).toBe(200);
    expect(
      (
        await prisma.priorityLevel.findUniqueOrThrow({
          where: { id: unusedId },
        })
      ).deletedAt
    ).toBeInstanceOf(Date);

    const usedResponse = await apiRequest(
      'POST',
      '/api/priorities',
      account.token,
      { name: 'Used custom level' }
    );
    expect(usedResponse.status).toBe(201);
    const usedId = id(usedResponse.body);
    const project = await prisma.project.create({
      data: { userId: account.id, name: 'Priority reassignment project' },
    });
    const createdTasks = await Promise.all(
      ['First task', 'Second task'].map((title) =>
        apiRequest('POST', '/api/tasks', account.token, {
          title,
          projectId: project.id,
          priorityId: usedId,
        })
      )
    );
    expect(createdTasks.map(({ status }) => status)).toEqual([201, 201]);
    const taskIds = createdTasks.map(({ body }) => id(body));

    const requiredReassign = await apiRequest(
      'DELETE',
      `/api/priorities/${usedId}`,
      account.token
    );
    expect(requiredReassign.status).toBe(409);
    expect(requiredReassign.body).toMatchObject({
      code: 'reassign-required',
    });

    const deleteUsed = await apiRequest(
      'DELETE',
      `/api/priorities/${usedId}?reassignTo=${low.id}`,
      account.token
    );
    expect(deleteUsed.status).toBe(200);
    const reassigned = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, priorityId: true },
      orderBy: { id: 'asc' },
    });
    expect(reassigned).toEqual(
      taskIds
        .slice()
        .sort((a, b) => a - b)
        .map((taskId) => ({ id: taskId, priorityId: low.id }))
    );

    const defaultRequiresReassign = await apiRequest(
      'DELETE',
      `/api/priorities/${medium.id}`,
      account.token
    );
    expect(defaultRequiresReassign.status).toBe(409);
    expect(defaultRequiresReassign.body).toMatchObject({
      code: 'reassign-required',
    });
    const deleteDefault = await apiRequest(
      'DELETE',
      `/api/priorities/${medium.id}?reassignTo=${high.id}`,
      account.token
    );
    expect(deleteDefault.status).toBe(200);
    expect(
      (await listPriorities(account.token))
        .filter(({ isDefault }) => isDefault)
        .map(({ id: priorityId }) => priorityId)
    ).toEqual([high.id]);
    expect(
      await prisma.priorityLevel.count({
        where: { userId: account.id, deletedAt: null, isDefault: true },
      })
    ).toBe(1);

    const deleteLow = await apiRequest(
      'DELETE',
      `/api/priorities/${low.id}?reassignTo=${high.id}`,
      account.token
    );
    expect(deleteLow.status).toBe(200);
    expect(
      await prisma.task.count({
        where: { id: { in: taskIds }, priorityId: high.id },
      })
    ).toBe(taskIds.length);

    const deleteLast = await apiRequest(
      'DELETE',
      `/api/priorities/${high.id}`,
      account.token
    );
    expect(deleteLast.status).toBe(409);
    expect(deleteLast.body).toMatchObject({ code: 'last-priority' });
  });

  it('creates tasks with the default, priorityId, and legacy priority name and sorts by priority order', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const priorities = await listPriorities(account.token);
    const otherPriorities = await listPriorities(otherAccount.token);
    const defaultPriority = priorities.find(({ isDefault }) => isDefault);
    const custom = await apiRequest('POST', '/api/priorities', account.token, {
      name: 'Custom task priority',
      color: '#123456',
    });
    expect(custom.status).toBe(201);
    const customId = id(custom.body);
    const low = priorities.find(({ name }) => name.toLowerCase() === 'low');
    const high = priorities.find(({ name }) => name.toLowerCase() === 'high');
    if (!defaultPriority || !low || !high) {
      throw new Error('Expected default priorities');
    }

    const defaultTask = await apiRequest('POST', '/api/tasks', account.token, {
      title: 'Task using account default',
    });
    const idTask = await apiRequest('POST', '/api/tasks', account.token, {
      title: 'Task using priority id',
      priorityId: customId,
    });
    const nameTask = await apiRequest('POST', '/api/tasks', account.token, {
      title: 'Task using legacy priority name',
      priority: 'high',
    });
    expect(defaultTask.status).toBe(201);
    expect(idTask.status).toBe(201);
    expect(nameTask.status).toBe(201);
    expect(defaultTask.body.priority).toBe('medium');
    expect(idTask.body.priority).toEqual({
      id: customId,
      name: 'Custom task priority',
      color: '#123456',
      sortOrder: custom.body.sortOrder,
    });
    expect(nameTask.body.priority).toBe('high');

    const foreignPriority = otherPriorities[0];
    const foreignIdTask = await apiRequest(
      'POST',
      '/api/tasks',
      account.token,
      { title: 'Foreign priority id', priorityId: foreignPriority.id }
    );
    expect(foreignIdTask.status).toBe(400);
    expect(
      await prisma.task.findUniqueOrThrow({
        where: { id: id(defaultTask.body) },
      })
    ).toMatchObject({ priorityId: defaultPriority.id });
    expect(
      await prisma.task.findUniqueOrThrow({
        where: { id: id(nameTask.body) },
      })
    ).toMatchObject({ priorityId: high.id });

    const taskList = await apiRequest(
      'GET',
      '/api/tasks?status=all&orderBy=priority&orderDirection=asc',
      account.token
    );
    expect(taskList.status).toBe(200);
    const expected = [
      { id: idTask.body.id, sortOrder: custom.body.sortOrder as number },
      { id: defaultTask.body.id, sortOrder: defaultPriority.sortOrder },
      { id: nameTask.body.id, sortOrder: high.sortOrder },
    ]
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map(({ id: taskId }) => taskId);
    expect(ids(taskList.body)).toEqual(expected);
    expect(idTask.body.priority).toMatchObject({
      id: customId,
      name: 'Custom task priority',
      color: '#123456',
      sortOrder: custom.body.sortOrder,
    });
    expect([low.id, defaultPriority.id, high.id]).toHaveLength(3);
  });

  it('hides another user’s priorities and validates bodies, params, and authentication', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const otherPriority = (await listPriorities(otherAccount.token))[0];

    for (const [method, path, body] of [
      ['GET', `/api/priorities/${otherPriority.id}`, undefined],
      ['PUT', `/api/priorities/${otherPriority.id}`, { name: 'Changed' }],
      ['PUT', `/api/priorities/${otherPriority.id}/default`, undefined],
      ['DELETE', `/api/priorities/${otherPriority.id}`, undefined],
    ] as const) {
      const response = await apiRequest(method, path, account.token, body);
      expect(response.status).toBe(404);
    }

    for (const body of [
      { name: '' },
      { name: 'n'.repeat(51) },
      { name: 'Invalid color', color: 'blue' },
      { name: 'Unexpected property', unsupported: true },
    ]) {
      const response = await apiRequest(
        'POST',
        '/api/priorities',
        account.token,
        body
      );
      expect(response.status).toBe(400);
    }
    for (const [method, path, body] of [
      ['GET', '/api/priorities/not-a-number', undefined],
      ['PUT', '/api/priorities/not-a-number', { name: 'Invalid id' }],
      ['PUT', '/api/priorities/reorder', { priorityIds: [] }],
      ['PUT', '/api/priorities/reorder', { priorityIds: [1], extra: true }],
      ['DELETE', '/api/priorities/1?reassignTo=invalid', undefined],
    ] as const) {
      const response = await apiRequest(method, path, account.token, body);
      expect(response.status).toBe(400);
    }

    const unauthenticatedRoutes = [
      ['GET', '/api/priorities', undefined],
      ['POST', '/api/priorities', { name: 'Unauthenticated' }],
      ['GET', '/api/priorities/1', undefined],
      ['PUT', '/api/priorities/1', { name: 'Unauthenticated' }],
      ['PUT', '/api/priorities/1/default', undefined],
      ['PUT', '/api/priorities/reorder', { priorityIds: [1] }],
      ['DELETE', '/api/priorities/1', undefined],
    ] as const;
    for (const [method, path, body] of unauthenticatedRoutes) {
      const response = await apiRequest(method, path, undefined, body);
      expect(response.status).toBe(401);
    }
  });
});
