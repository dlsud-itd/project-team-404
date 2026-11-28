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

integrationDescribe('task organization integration', () => {
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

  async function taskRequest(
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

  async function seedProject(userId: string, name: string) {
    return prisma.project.create({ data: { userId, name } });
  }

  async function seedTask(
    userId: string,
    projectId: number,
    values: {
      title: string;
      position?: number;
      dueDate?: Date | null;
      scheduledDate?: Date | null;
      createdAt?: Date;
      updatedAt?: Date;
      deletedAt?: Date | null;
    }
  ) {
    const priority = await prisma.priorityLevel.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { isDefault: 'desc' },
      select: { id: true },
    });
    if (!priority) {
      throw new Error(
        `No priority level exists for integration user ${userId}`
      );
    }
    return prisma.task.create({
      data: {
        userId,
        projectId,
        priorityId: priority.id,
        position: values.position,
        title: values.title,
        dueDate: values.dueDate,
        scheduledDate: values.scheduledDate,
        createdAt: values.createdAt,
        updatedAt: values.updatedAt,
        deletedAt: values.deletedAt,
      },
    });
  }

  async function reorder(
    projectId: number,
    taskIds: number[],
    token?: string
  ): Promise<TestResponse> {
    return taskRequest('PUT', '/api/tasks/reorder', token, {
      projectId,
      taskIds,
    });
  }

  async function listTasks(
    projectId: number,
    token: string,
    orderBy = 'position'
  ): Promise<TestResponse> {
    const query = new URLSearchParams({
      projectId: String(projectId),
      orderBy,
      orderDirection: 'asc',
    });
    return taskRequest('GET', `/api/tasks?${query}`, token);
  }

  function taskIds(body: unknown): number[] {
    if (!Array.isArray(body)) {
      throw new Error('Expected task list response to be an array');
    }
    return body.map((task: unknown) => {
      if (
        typeof task !== 'object' ||
        task === null ||
        !('id' in task) ||
        typeof task.id !== 'number'
      ) {
        throw new Error('Expected task list entries to include numeric ids');
      }
      return task.id;
    });
  }

  async function activeRows(userId: string, projectId: number) {
    return prisma.task.findMany({
      where: {
        userId,
        projectId,
        deletedAt: null,
        archivedAt: null,
        isDone: false,
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true, position: true },
    });
  }

  it('reorders tasks through the API and persists contiguous positions', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Reorder API project');
    const first = await seedTask(account.id, project.id, {
      title: 'First task',
      position: 10,
    });
    const second = await seedTask(account.id, project.id, {
      title: 'Second task',
      position: 20,
    });
    const third = await seedTask(account.id, project.id, {
      title: 'Third task',
      position: 30,
    });
    const expectedOrder = [third.id, first.id, second.id];

    const response = await reorder(project.id, expectedOrder, account.token);
    const listResponse = await listTasks(project.id, account.token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      projectId: project.id,
      taskIds: expectedOrder,
    });
    expect(listResponse.status).toBe(200);
    expect(taskIds(listResponse.body)).toEqual(expectedOrder);
    expect(
      (await activeRows(account.id, project.id)).map(({ position }) => position)
    ).toEqual([1, 2, 3]);
  });

  it('appends new tasks and moved tasks to the end of their destination project', async () => {
    const account = await createAccount();
    const source = await seedProject(account.id, 'Append source project');
    const destination = await seedProject(
      account.id,
      'Append destination project'
    );
    const first = await seedTask(account.id, source.id, {
      title: 'Source first',
      position: 1,
    });
    const second = await seedTask(account.id, source.id, {
      title: 'Source second',
      position: 2,
    });
    const existingDestination = await seedTask(account.id, destination.id, {
      title: 'Destination existing',
      position: 1,
    });

    const initialReorder = await reorder(
      source.id,
      [second.id, first.id],
      account.token
    );
    expect(initialReorder.status).toBe(200);

    const createdResponse = await taskRequest(
      'POST',
      '/api/tasks',
      account.token,
      { title: 'New task', projectId: source.id }
    );
    expect(createdResponse.status).toBe(201);
    const newTaskId = taskIds([createdResponse.body])[0]!;
    const sourceList = await listTasks(source.id, account.token);
    expect(taskIds(sourceList.body)).toEqual([second.id, first.id, newTaskId]);
    expect(
      (await activeRows(account.id, source.id)).map(({ position }) => position)
    ).toEqual([1, 2, 3]);

    const moveResponse = await taskRequest(
      'PUT',
      `/api/tasks/${first.id}`,
      account.token,
      { projectId: destination.id }
    );
    expect(moveResponse.status).toBe(200);
    const destinationList = await listTasks(destination.id, account.token);
    expect(taskIds(destinationList.body)).toEqual([
      existingDestination.id,
      first.id,
    ]);
    expect(
      (await activeRows(account.id, destination.id)).map(
        ({ position }) => position
      )
    ).toEqual([1, 2]);
  });

  it('rejects duplicate, empty, and oversized reorder lists without changing positions', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Invalid reorder project');
    const first = await seedTask(account.id, project.id, {
      title: 'First task',
      position: 4,
    });
    const second = await seedTask(account.id, project.id, {
      title: 'Second task',
      position: 8,
    });
    const before = await activeRows(account.id, project.id);

    const invalidLists = [
      [first.id, first.id, second.id],
      [],
      Array.from({ length: 501 }, (_, index) => index + 10_000),
    ];
    for (const taskIds of invalidLists) {
      const response = await reorder(project.id, taskIds, account.token);
      expect(response.status).toBe(400);
      expect(await activeRows(account.id, project.id)).toEqual(before);
    }
  });

  it('returns 404 for foreign-project, foreign-user, and deleted task IDs without changes', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const project = await seedProject(account.id, 'Ownership reorder project');
    const anotherProject = await seedProject(
      account.id,
      'Other reorder project'
    );
    const first = await seedTask(account.id, project.id, {
      title: 'Owned first',
      position: 7,
    });
    const second = await seedTask(account.id, project.id, {
      title: 'Owned second',
      position: 11,
    });
    const foreignProjectTask = await seedTask(account.id, anotherProject.id, {
      title: 'Other project task',
      position: 1,
    });
    const foreignUserProject = await seedProject(
      otherAccount.id,
      'Foreign user project'
    );
    const foreignUserTask = await seedTask(
      otherAccount.id,
      foreignUserProject.id,
      { title: 'Foreign user task', position: 1 }
    );
    const deletedTask = await seedTask(account.id, project.id, {
      title: 'Deleted task',
      position: 15,
      deletedAt: new Date(),
    });
    const before = await activeRows(account.id, project.id);

    for (const invalidId of [
      foreignProjectTask.id,
      foreignUserTask.id,
      deletedTask.id,
    ]) {
      const response = await reorder(
        project.id,
        [second.id, invalidId, first.id],
        account.token
      );
      expect(response.status).toBe(404);
      expect(await activeRows(account.id, project.id)).toEqual(before);
    }
  });

  it('returns 409 for a stale list that omits an active task without changing positions', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Stale reorder project');
    const first = await seedTask(account.id, project.id, {
      title: 'First task',
      position: 3,
    });
    const second = await seedTask(account.id, project.id, {
      title: 'Second task',
      position: 6,
    });
    await seedTask(account.id, project.id, {
      title: 'Added after client loaded',
      position: 9,
    });
    const before = await activeRows(account.id, project.id);

    const response = await reorder(
      project.id,
      [second.id, first.id],
      account.token
    );

    expect(response.status).toBe(409);
    expect(await activeRows(account.id, project.id)).toEqual(before);
  });

  it('keeps positions complete after two consecutive reorders', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Repeated reorder project');
    const tasks = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        seedTask(account.id, project.id, {
          title: `Task ${index + 1}`,
          position: (index + 1) * 5,
        })
      )
    );
    const firstOrder = [tasks[3]!.id, tasks[1]!.id, tasks[0]!.id, tasks[2]!.id];
    const secondOrder = [
      tasks[2]!.id,
      tasks[0]!.id,
      tasks[3]!.id,
      tasks[1]!.id,
    ];

    expect((await reorder(project.id, firstOrder, account.token)).status).toBe(
      200
    );
    const firstState = await activeRows(account.id, project.id);
    expect(firstState.map(({ id }) => id)).toEqual(firstOrder);
    expect(firstState.map(({ position }) => position)).toEqual([1, 2, 3, 4]);

    expect((await reorder(project.id, secondOrder, account.token)).status).toBe(
      200
    );
    const secondState = await activeRows(account.id, project.id);
    expect(secondState.map(({ id }) => id)).toEqual(secondOrder);
    expect(secondState.map(({ position }) => position)).toEqual([1, 2, 3, 4]);
  });

  it('accepts every task orderBy value', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Order by compatibility');
    const tasks = await Promise.all(
      ['Alpha', 'Bravo', 'Charlie'].map((title, index) =>
        seedTask(account.id, project.id, {
          title,
          position: index + 1,
          dueDate: new Date(Date.UTC(2026, 0, index + 1)),
          scheduledDate: new Date(Date.UTC(2026, 1, index + 1)),
          createdAt: new Date(Date.UTC(2026, 3, index + 1)),
          updatedAt: new Date(Date.UTC(2026, 4, index + 1)),
        })
      )
    );
    const expectedIds = tasks.map(({ id }) => id).sort((a, b) => a - b);

    for (const orderBy of [
      'dueDate',
      'scheduledDate',
      'priority',
      'title',
      'position',
      'createdAt',
      'updatedAt',
    ]) {
      const response = await listTasks(project.id, account.token, orderBy);
      expect(response.status).toBe(200);
      expect(taskIds(response.body).sort((a, b) => a - b)).toEqual(expectedIds);
    }
  });

  it('requires authentication for reorder requests', async () => {
    const response = await reorder(1, [1]);

    expect(response.status).toBe(401);
  });
});
