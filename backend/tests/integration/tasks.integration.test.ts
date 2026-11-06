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

integrationDescribe('tasks integration', () => {
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

  async function seedProject(
    userId: string,
    name: string,
    deletedAt: Date | null = null
  ) {
    return prisma.project.create({
      data: { userId, name, deletedAt },
    });
  }

  async function seedTask(
    userId: string,
    projectId: number,
    values: {
      title: string;
      description?: string | null;
      isDone?: boolean;
      dueDate?: Date;
      createdAt?: Date;
      updatedAt?: Date;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.task.create({
      data: {
        userId,
        projectId,
        priorityId: mediumPriorityId,
        title: values.title,
        description: values.description,
        isDone: values.isDone,
        dueDate: values.dueDate,
        createdAt: values.createdAt,
        updatedAt: values.updatedAt,
        deletedAt: values.deletedAt,
      },
    });
  }

  function taskId(body: unknown): number {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'number'
    ) {
      throw new Error('Expected task response to include a numeric id');
    }
    return body.id;
  }

  function taskIds(body: unknown): number[] {
    if (!Array.isArray(body)) {
      throw new Error('Expected task list response to be an array');
    }
    return body.map(taskId);
  }

  it('creates a task in an owned project and persists its owner and fields', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Task integration project');
    const response = await taskRequest('POST', '/api/tasks', account.token, {
      title: 'Prepare release notes',
      description: 'Summarize the completed work.',
      projectId: project.id,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Prepare release notes',
      description: 'Summarize the completed work.',
      projectId: project.id,
    });

    const row = await prisma.task.findUniqueOrThrow({
      where: { id: taskId(response.body) },
    });
    expect(row).toMatchObject({
      userId: account.id,
      projectId: project.id,
      title: 'Prepare release notes',
      description: 'Summarize the completed work.',
      deletedAt: null,
    });
  });

  it('rejects invalid task bodies and missing, deleted, or foreign projects without creating tasks', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const deletedProject = await seedProject(
      account.id,
      'Deleted task project',
      new Date()
    );
    const foreignProject = await seedProject(
      otherAccount.id,
      'Another user task project'
    );
    const countBefore = await prisma.task.count();

    for (const body of [
      { title: '' },
      { title: 't'.repeat(201) },
      { title: 'Valid title', unsupported: true },
    ]) {
      const response = await taskRequest(
        'POST',
        '/api/tasks',
        account.token,
        body
      );
      expect(response.status).toBe(400);
    }

    for (const projectId of [
      2147483647,
      deletedProject.id,
      foreignProject.id,
    ]) {
      const response = await taskRequest('POST', '/api/tasks', account.token, {
        title: 'Must not be created',
        projectId,
      });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found' });
    }

    expect(await prisma.task.count()).toBe(countBefore);
  });

  it('filters lists by project and status, paginates, and excludes deleted and other users’ tasks', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const project = await seedProject(account.id, 'List project');
    const anotherProject = await seedProject(account.id, 'Other list project');
    const otherUserProject = await seedProject(
      otherAccount.id,
      'Private list project'
    );
    const first = await seedTask(account.id, project.id, {
      title: 'First active task',
      dueDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    const second = await seedTask(account.id, project.id, {
      title: 'Second active task',
      dueDate: new Date('2026-01-02T00:00:00.000Z'),
    });
    const third = await seedTask(account.id, project.id, {
      title: 'Third active task',
      dueDate: new Date('2026-01-03T00:00:00.000Z'),
    });
    const completed = await seedTask(account.id, project.id, {
      title: 'Completed task',
      isDone: true,
      dueDate: new Date('2026-01-04T00:00:00.000Z'),
    });
    const deleted = await seedTask(account.id, project.id, {
      title: 'Deleted task',
      dueDate: new Date('2025-12-31T00:00:00.000Z'),
      deletedAt: new Date(),
    });
    const anotherProjectTask = await seedTask(account.id, anotherProject.id, {
      title: 'Task in another project',
      dueDate: new Date('2026-01-05T00:00:00.000Z'),
    });
    const foreignTask = await seedTask(otherAccount.id, otherUserProject.id, {
      title: 'Another user task',
      dueDate: new Date('2025-12-30T00:00:00.000Z'),
    });

    const activePage = async (page: number) => {
      const query = new URLSearchParams({
        projectId: String(project.id),
        status: 'active',
        page: String(page),
        pageSize: '2',
      });
      return taskRequest('GET', `/api/tasks?${query}`, account.token);
    };

    const firstPage = await activePage(1);
    const secondPage = await activePage(2);
    expect(firstPage.status).toBe(200);
    expect(taskIds(firstPage.body)).toEqual([first.id, second.id]);
    expect(secondPage.status).toBe(200);
    expect(taskIds(secondPage.body)).toEqual([third.id]);

    const completedQuery = new URLSearchParams({
      projectId: String(project.id),
      status: 'completed',
    });
    const completedResponse = await taskRequest(
      'GET',
      `/api/tasks?${completedQuery}`,
      account.token
    );
    expect(completedResponse.status).toBe(200);
    expect(taskIds(completedResponse.body)).toEqual([completed.id]);

    const allQuery = new URLSearchParams({
      projectId: String(project.id),
      status: 'all',
      page: '1',
      pageSize: '100',
    });
    const allResponse = await taskRequest(
      'GET',
      `/api/tasks?${allQuery}`,
      account.token
    );
    expect(allResponse.status).toBe(200);
    expect(taskIds(allResponse.body).sort((a, b) => a - b)).toEqual(
      [first.id, second.id, third.id, completed.id].sort((a, b) => a - b)
    );
    expect(taskIds(allResponse.body)).not.toContain(deleted.id);
    expect(taskIds(allResponse.body)).not.toContain(anotherProjectTask.id);
    expect(taskIds(allResponse.body)).not.toContain(foreignTask.id);
  });

  it('gets an owned task and hides other users’ and missing tasks while validating IDs', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const ownProject = await seedProject(account.id, 'Get own project');
    const otherProject = await seedProject(
      otherAccount.id,
      'Get private project'
    );
    const ownTask = await seedTask(account.id, ownProject.id, {
      title: 'Owned task',
      description: 'Task details',
    });
    const otherTask = await seedTask(otherAccount.id, otherProject.id, {
      title: 'Private task',
    });

    const ownResponse = await taskRequest(
      'GET',
      `/api/tasks/${ownTask.id}`,
      account.token
    );
    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body).toMatchObject({
      id: ownTask.id,
      title: 'Owned task',
      description: 'Task details',
      projectId: ownProject.id,
    });

    for (const id of [otherTask.id, 2147483647]) {
      const response = await taskRequest(
        'GET',
        `/api/tasks/${id}`,
        account.token
      );
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    }

    const invalidId = await taskRequest(
      'GET',
      '/api/tasks/not-a-number',
      account.token
    );
    expect(invalidId.status).toBe(400);
  });

  it('updates owned tasks, permits moving within owned projects, and rejects foreign projects and tasks', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const firstProject = await seedProject(account.id, 'Update source project');
    const secondProject = await seedProject(
      account.id,
      'Update destination project'
    );
    const foreignProject = await seedProject(
      otherAccount.id,
      'Update foreign project'
    );
    const oldUpdatedAt = new Date('2020-01-01T00:00:00.000Z');
    const ownTask = await seedTask(account.id, firstProject.id, {
      title: 'Original task',
      description: 'Original description',
      updatedAt: oldUpdatedAt,
    });
    const otherTask = await seedTask(otherAccount.id, foreignProject.id, {
      title: 'Another user task',
      description: 'Private description',
    });

    const updateResponse = await taskRequest(
      'PUT',
      `/api/tasks/${ownTask.id}`,
      account.token,
      { title: 'Updated task', description: 'Updated description' }
    );
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      taskId: ownTask.id,
      message: 'Task updated successfully',
    });
    let updatedRow = await prisma.task.findUniqueOrThrow({
      where: { id: ownTask.id },
    });
    expect(updatedRow).toMatchObject({
      title: 'Updated task',
      description: 'Updated description',
      projectId: firstProject.id,
    });
    expect(updatedRow.updatedAt.getTime()).toBeGreaterThan(
      oldUpdatedAt.getTime()
    );

    const moveResponse = await taskRequest(
      'PUT',
      `/api/tasks/${ownTask.id}`,
      account.token,
      { projectId: secondProject.id }
    );
    expect(moveResponse.status).toBe(200);
    updatedRow = await prisma.task.findUniqueOrThrow({
      where: { id: ownTask.id },
    });
    expect(updatedRow.projectId).toBe(secondProject.id);

    const foreignProjectResponse = await taskRequest(
      'PUT',
      `/api/tasks/${ownTask.id}`,
      account.token,
      { projectId: foreignProject.id }
    );
    expect(foreignProjectResponse.status).toBe(404);
    expect(foreignProjectResponse.body).toEqual({
      error: 'Project not found',
    });
    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: ownTask.id } })
    ).toMatchObject({
      title: 'Updated task',
      description: 'Updated description',
      projectId: secondProject.id,
    });

    const otherTaskBefore = await prisma.task.findUniqueOrThrow({
      where: { id: otherTask.id },
    });
    const otherTaskResponse = await taskRequest(
      'PUT',
      `/api/tasks/${otherTask.id}`,
      account.token,
      { title: 'Unauthorized change' }
    );
    expect(otherTaskResponse.status).toBe(404);
    expect(otherTaskResponse.body).toEqual({ error: 'Task not found' });
    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: otherTask.id } })
    ).toEqual(otherTaskBefore);
  });

  it('rejects invalid updates without changing the task', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Invalid update project');
    const task = await seedTask(account.id, project.id, {
      title: 'Task before invalid updates',
      description: 'This task must remain unchanged.',
    });
    const originalTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    });

    for (const body of [
      { title: '' },
      { title: 't'.repeat(201) },
      { title: 'Invalid update', unsupported: true },
      { scheduledDate: 'not-a-date' },
    ]) {
      const response = await taskRequest(
        'PUT',
        `/api/tasks/${task.id}`,
        account.token,
        body
      );
      expect(response.status).toBe(400);
    }

    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
    ).toEqual(originalTask);
  });

  it('soft-deletes a task so it leaves lists, cannot be fetched, and cannot be deleted twice', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Delete project');
    const task = await seedTask(account.id, project.id, {
      title: 'Task to delete',
    });

    const deleteResponse = await taskRequest(
      'DELETE',
      `/api/tasks/${task.id}`,
      account.token
    );
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      message: 'Task deleted successfully',
    });

    const row = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    });
    expect(row.deletedAt).toBeInstanceOf(Date);

    const listResponse = await taskRequest(
      'GET',
      `/api/tasks?projectId=${project.id}&status=all`,
      account.token
    );
    expect(listResponse.status).toBe(200);
    expect(taskIds(listResponse.body)).not.toContain(task.id);

    const getResponse = await taskRequest(
      'GET',
      `/api/tasks/${task.id}`,
      account.token
    );
    expect(getResponse.status).toBe(404);
    expect(getResponse.body).toEqual({ error: 'Task not found' });

    const secondDelete = await taskRequest(
      'DELETE',
      `/api/tasks/${task.id}`,
      account.token
    );
    expect(secondDelete.status).toBe(404);
    expect(secondDelete.body).toEqual({ error: 'Task not found' });
  });

  it('does not delete another user’s or a nonexistent task', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const project = await seedProject(
      otherAccount.id,
      'Private delete project'
    );
    const otherTask = await seedTask(otherAccount.id, project.id, {
      title: 'Task owned by another user',
    });
    const otherTaskBefore = await prisma.task.findUniqueOrThrow({
      where: { id: otherTask.id },
    });

    for (const id of [otherTask.id, 2147483647]) {
      const response = await taskRequest(
        'DELETE',
        `/api/tasks/${id}`,
        account.token
      );
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    }

    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: otherTask.id } })
    ).toEqual(otherTaskBefore);
  });

  it('requires a valid token on every task route', async () => {
    const account = await createAccount();
    const countBefore = await prisma.task.count({
      where: { userId: account.id },
    });
    const routes = [
      { method: 'POST', path: '/api/tasks', body: { title: 'Unauthorized' } },
      { method: 'GET', path: '/api/tasks' },
      { method: 'GET', path: '/api/tasks/1' },
      { method: 'PUT', path: '/api/tasks/1', body: { title: 'Unauthorized' } },
      {
        method: 'PUT',
        path: '/api/tasks/1/due-date',
        body: { dueDate: '2026-03-10' },
      },
      {
        method: 'PUT',
        path: '/api/tasks/1/deadline',
        body: { deadline: '2026-03-10T12:00:00.000Z' },
      },
      {
        method: 'PUT',
        path: '/api/tasks/1/recurrence',
        body: { recurrence: 'daily' },
      },
      {
        method: 'PUT',
        path: '/api/tasks/1/priority',
        body: { priority: 'high' },
      },
      { method: 'GET', path: '/api/tasks/1/labels' },
      {
        method: 'POST',
        path: '/api/tasks/1/labels',
        body: { labelIds: [1] },
      },
      { method: 'DELETE', path: '/api/tasks/1/labels/1' },
      { method: 'DELETE', path: '/api/tasks/1' },
    ];

    for (const route of routes) {
      for (const token of [undefined, 'not-a-valid-session-token']) {
        const response = await taskRequest(
          route.method,
          route.path,
          token,
          route.body
        );
        expect(response.status).toBe(401);
      }
    }

    expect(await prisma.task.count({ where: { userId: account.id } })).toBe(
      countBefore
    );
  });

  describe('Task Scheduling', () => {
    it('sets, changes, and clears due dates and deadlines through their routes', async () => {
      const account = await createAccount();
      const project = await seedProject(account.id, 'Scheduling date project');
      const task = await seedTask(account.id, project.id, {
        title: 'Change task dates',
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
      });

      const dueDateValues = [
        { value: '2026-03-12', expected: new Date('2026-03-12T00:00:00.000Z') },
        { value: '2026-03-18', expected: new Date('2026-03-18T00:00:00.000Z') },
        { value: null, expected: null },
      ] as const;
      for (const { value, expected } of dueDateValues) {
        const response = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/due-date`,
          account.token,
          { dueDate: value }
        );
        expect(response.status).toBe(200);
        expect(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .dueDate
        ).toEqual(expected);
      }

      const deadlineValues = [
        {
          value: '2026-03-20T12:30:00.000Z',
          expected: new Date('2026-03-20T12:30:00.000Z'),
        },
        {
          value: '2026-03-22T18:45:00.000Z',
          expected: new Date('2026-03-22T18:45:00.000Z'),
        },
        { value: null, expected: null },
      ] as const;
      for (const { value, expected } of deadlineValues) {
        const response = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/deadline`,
          account.token,
          { deadline: value }
        );
        expect(response.status).toBe(200);
        expect(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .deadline
        ).toEqual(expected);
      }
    });

    it('rejects a deadline before the due date without changing either value', async () => {
      const account = await createAccount();
      const project = await seedProject(
        account.id,
        'Deadline validation project'
      );
      const task = await seedTask(account.id, project.id, {
        title: 'Keep valid deadline',
        dueDate: new Date('2026-03-20T00:00:00.000Z'),
      });
      await taskRequest(
        'PUT',
        `/api/tasks/${task.id}/deadline`,
        account.token,
        {
          deadline: '2026-03-21T12:00:00.000Z',
        }
      );
      const before = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });

      const invalid = await taskRequest(
        'PUT',
        `/api/tasks/${task.id}/deadline`,
        account.token,
        { deadline: '2026-03-19T23:59:59.000Z' }
      );

      expect(invalid.status).toBe(400);
      expect(
        await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
      ).toEqual(before);
    });

    it('persists daily, weekday-based weekly, and monthly rules and rejects invalid recurrence input', async () => {
      const account = await createAccount();
      const project = await seedProject(account.id, 'Recurrence rule project');

      for (const rule of [
        { recurrence: 'daily' },
        { recurrence: 'weekly', recurrenceDays: [2, 4] },
        { recurrence: 'monthly' },
      ]) {
        const task = await seedTask(account.id, project.id, {
          title: `Rule ${rule.recurrence}`,
          dueDate: new Date('2026-03-10T00:00:00.000Z'),
        });
        const response = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/recurrence`,
          account.token,
          rule
        );
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(rule);
        expect(
          await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
        ).toMatchObject({
          recurrence: rule.recurrence,
          ...(rule.recurrence === 'weekly'
            ? { recurrenceDays: rule.recurrenceDays }
            : {}),
        });
      }

      const task = await seedTask(account.id, project.id, {
        title: 'Reject invalid recurrence',
      });
      for (const body of [
        { recurrence: 'yearly' },
        { recurrence: 'daily', recurrenceDays: [1] },
      ]) {
        const response = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/recurrence`,
          account.token,
          body
        );
        expect(response.status).toBe(400);
      }
      expect(
        await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
      ).toMatchObject({ recurrence: 'none' });
    });

    it.each([
      {
        recurrence: 'daily',
        dueDate: '2026-03-10',
        nextDueDate: '2026-03-11',
      },
      {
        recurrence: 'weekly',
        recurrenceDays: [2],
        dueDate: '2026-03-10',
        nextDueDate: '2026-03-17',
      },
      {
        recurrence: 'monthly',
        dueDate: '2026-01-31',
        nextDueDate: '2026-02-28',
      },
      {
        recurrence: 'monthly',
        dueDate: '2024-01-31',
        nextDueDate: '2024-02-29',
      },
      {
        recurrence: 'monthly',
        dueDate: '2026-03-31',
        nextDueDate: '2026-04-30',
      },
    ])(
      'completing $recurrence creates exactly one next occurrence',
      async ({ recurrence, recurrenceDays, dueDate, nextDueDate }) => {
        const account = await createAccount();
        const project = await seedProject(
          account.id,
          'Next occurrence project'
        );
        const task = await seedTask(account.id, project.id, {
          title: `Repeat ${recurrence} ${dueDate}`,
          dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        });
        const rule = {
          recurrence,
          ...(recurrenceDays === undefined ? {} : { recurrenceDays }),
        };
        const configured = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/recurrence`,
          account.token,
          rule
        );
        expect(configured.status).toBe(200);

        const completed = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}`,
          account.token,
          { isDone: true }
        );
        expect(completed.status).toBe(200);

        const occurrences = await prisma.task.findMany({
          where: {
            userId: account.id,
            projectId: project.id,
            title: task.title,
            deletedAt: null,
          },
          orderBy: { id: 'asc' },
        });
        expect(occurrences).toHaveLength(2);
        expect(occurrences[0]).toMatchObject({
          id: task.id,
          isDone: true,
        });
        expect(occurrences[1]).toMatchObject({
          userId: account.id,
          projectId: project.id,
          title: task.title,
          isDone: false,
          recurrence,
          ...(recurrenceDays === undefined ? {} : { recurrenceDays }),
          dueDate: new Date(`${nextDueDate}T00:00:00.000Z`),
        });
      }
    );

    it('does not duplicate occurrences for non-recurring, completed, or concurrently completed tasks', async () => {
      const account = await createAccount();
      const project = await seedProject(
        account.id,
        'Completion idempotency project'
      );

      const nonRecurring = await seedTask(account.id, project.id, {
        title: 'One-time task',
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
      });
      expect(
        (
          await taskRequest(
            'PUT',
            `/api/tasks/${nonRecurring.id}`,
            account.token,
            { isDone: true }
          )
        ).status
      ).toBe(200);
      expect(
        await prisma.task.count({
          where: {
            userId: account.id,
            projectId: project.id,
            title: nonRecurring.title,
            id: { not: nonRecurring.id },
          },
        })
      ).toBe(0);

      const alreadyCompleted = await seedTask(account.id, project.id, {
        title: 'Already completed recurring task',
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
        isDone: true,
      });
      expect(
        (
          await taskRequest(
            'PUT',
            `/api/tasks/${alreadyCompleted.id}/recurrence`,
            account.token,
            { recurrence: 'daily' }
          )
        ).status
      ).toBe(200);
      expect(
        (
          await taskRequest(
            'PUT',
            `/api/tasks/${alreadyCompleted.id}`,
            account.token,
            { isDone: true }
          )
        ).status
      ).toBe(200);
      expect(
        await prisma.task.count({
          where: {
            userId: account.id,
            projectId: project.id,
            title: alreadyCompleted.title,
            id: { not: alreadyCompleted.id },
          },
        })
      ).toBe(0);

      const concurrent = await seedTask(account.id, project.id, {
        title: 'Concurrent completion task',
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
      });
      expect(
        (
          await taskRequest(
            'PUT',
            `/api/tasks/${concurrent.id}/recurrence`,
            account.token,
            { recurrence: 'daily' }
          )
        ).status
      ).toBe(200);
      const completions = await Promise.all([
        taskRequest('PUT', `/api/tasks/${concurrent.id}`, account.token, {
          isDone: true,
        }),
        taskRequest('PUT', `/api/tasks/${concurrent.id}`, account.token, {
          isDone: true,
        }),
      ]);
      expect(completions.map(({ status }) => status)).toEqual([200, 200]);
      expect(
        await prisma.task.count({
          where: {
            userId: account.id,
            projectId: project.id,
            title: concurrent.title,
            id: { not: concurrent.id },
          },
        })
      ).toBe(1);
    });

    it('uses the owner timezone when interpreting a 23:30 deadline in current/upcoming tasks', async () => {
      const manila = await createAccount();
      const honolulu = await createAccount();
      const timeZone = 'Pacific/Honolulu';
      const currentHonoluluDay = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const nowInHonolulu = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date());
      const deadlineDay =
        nowInHonolulu < '23:30'
          ? currentHonoluluDay
          : addCalendarDays(currentHonoluluDay, 1);
      const deadline = new Date(`${deadlineDay}T23:30:00-10:00`);
      const manilaDeadlineDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(deadline);
      const honoluluDeadlineDay = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(deadline);
      expect(manilaDeadlineDay).toBe(addCalendarDays(honoluluDeadlineDay, 1));

      for (const [account, timezone] of [
        [manila, 'Asia/Manila'],
        [honolulu, timeZone],
      ] as const) {
        await prisma.user.update({
          where: { id: account.id },
          data: { timezone },
        });
        const project = await seedProject(
          account.id,
          'Timezone boundary project'
        );
        const task = await seedTask(account.id, project.id, {
          title: 'Local 23:30 deadline',
          dueDate: new Date(`${manilaDeadlineDay}T00:00:00.000Z`),
        });
        const setDeadline = await taskRequest(
          'PUT',
          `/api/tasks/${task.id}/deadline`,
          account.token,
          { deadline: deadline.toISOString() }
        );
        expect(setDeadline.status).toBe(200);

        const dashboard = await taskRequest(
          'GET',
          '/api/dashboard/current-upcoming-tasks?days=30',
          account.token
        );
        expect(dashboard.status).toBe(200);
        expect(dashboard.body.tasks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: task.id,
              deadline: deadline.toISOString(),
            }),
          ])
        );
      }
    });

    it('hides another user’s scheduled task and requires authentication for scheduling and completion', async () => {
      const account = await createAccount();
      const otherAccount = await createAccount();
      const project = await seedProject(
        otherAccount.id,
        'Private schedule project'
      );
      const task = await seedTask(otherAccount.id, project.id, {
        title: 'Private scheduled task',
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
      });
      const before = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });

      for (const [path, body] of [
        [`/api/tasks/${task.id}/due-date`, { dueDate: '2026-03-12' }],
        [
          `/api/tasks/${task.id}/deadline`,
          { deadline: '2026-03-12T12:00:00.000Z' },
        ],
        [`/api/tasks/${task.id}/recurrence`, { recurrence: 'daily' }],
        [`/api/tasks/${task.id}`, { isDone: true }],
      ] as const) {
        const response = await taskRequest('PUT', path, account.token, body);
        expect(response.status).toBe(404);
      }
      expect(
        await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
      ).toEqual(before);

      for (const path of [
        `/api/tasks/${task.id}/due-date`,
        `/api/tasks/${task.id}/deadline`,
        `/api/tasks/${task.id}/recurrence`,
        `/api/tasks/${task.id}`,
      ]) {
        expect((await taskRequest('PUT', path, undefined, {})).status).toBe(
          401
        );
      }
    });
  });

  describe('Task Organization', () => {
    it('sets only supported priorities and filters tasks by priority, label, and both', async () => {
      const account = await createAccount();
      const project = await seedProject(account.id, 'Organization filters');
      const first = await seedTask(account.id, project.id, {
        title: 'High priority with both labels',
      });
      const second = await seedTask(account.id, project.id, {
        title: 'Medium priority with first label',
      });
      const third = await seedTask(account.id, project.id, {
        title: 'Medium priority with second label',
      });

      const firstLabelResponse = await taskRequest(
        'POST',
        '/api/labels',
        account.token,
        { name: 'First filter label', color: '#112233' }
      );
      const secondLabelResponse = await taskRequest(
        'POST',
        '/api/labels',
        account.token,
        { name: 'Second filter label', color: '#445566' }
      );
      const emptyLabelResponse = await taskRequest(
        'POST',
        '/api/labels',
        account.token,
        { name: 'Unused filter label' }
      );
      expect(firstLabelResponse.status).toBe(201);
      expect(secondLabelResponse.status).toBe(201);
      expect(emptyLabelResponse.status).toBe(201);
      const firstLabelId = labelId(firstLabelResponse.body);
      const secondLabelId = labelId(secondLabelResponse.body);
      const emptyLabelId = labelId(emptyLabelResponse.body);

      for (const [task, labelIds] of [
        [first, [firstLabelId, secondLabelId]],
        [second, [firstLabelId]],
        [third, [secondLabelId]],
      ] as const) {
        const attached = await taskRequest(
          'POST',
          `/api/tasks/${task.id}/labels`,
          account.token,
          { labelIds }
        );
        expect(attached.status).toBe(200);
      }

      const priorityResponse = await taskRequest(
        'PUT',
        `/api/tasks/${first.id}/priority`,
        account.token,
        { priority: 'high' }
      );
      expect(priorityResponse.status).toBe(200);
      expect(priorityResponse.body).toMatchObject({ priority: 'high' });
      expect(
        await prisma.task.findUniqueOrThrow({
          where: { id: first.id },
          include: { priorityLevel: true },
        })
      ).toMatchObject({
        priorityLevel: { name: 'high' },
      });

      const invalidPriority = await taskRequest(
        'PUT',
        `/api/tasks/${first.id}/priority`,
        account.token,
        { priority: 'urgent' }
      );
      expect(invalidPriority.status).toBe(400);
      expect(
        await prisma.task.findUniqueOrThrow({
          where: { id: first.id },
          include: { priorityLevel: true },
        })
      ).toMatchObject({
        priorityLevel: { name: 'high' },
      });

      const filteredTaskIds = async (query: URLSearchParams) => {
        const response = await taskRequest(
          'GET',
          `/api/tasks?${query}`,
          account.token
        );
        expect(response.status).toBe(200);
        return taskIds(response.body).sort((a, b) => a - b);
      };

      expect(
        await filteredTaskIds(new URLSearchParams({ priority: 'high' }))
      ).toEqual([first.id]);
      expect(
        await filteredTaskIds(
          new URLSearchParams({ labelId: String(firstLabelId) })
        )
      ).toEqual([first.id, second.id].sort((a, b) => a - b));
      expect(
        await filteredTaskIds(
          new URLSearchParams({
            priority: 'high',
            labelId: String(firstLabelId),
          })
        )
      ).toEqual([first.id]);
      expect(
        await filteredTaskIds(
          new URLSearchParams({ labelId: String(emptyLabelId) })
        )
      ).toEqual([]);
    });

    it('attaches and detaches labels idempotently and rejects cross-user links', async () => {
      const account = await createAccount();
      const otherAccount = await createAccount();
      const project = await seedProject(account.id, 'Owned labels project');
      const foreignProject = await seedProject(
        otherAccount.id,
        'Foreign labels project'
      );
      const task = await seedTask(account.id, project.id, {
        title: 'Task with labels',
      });
      const foreignTask = await seedTask(otherAccount.id, foreignProject.id, {
        title: 'Another user task',
      });
      const ownLabelResponse = await taskRequest(
        'POST',
        '/api/labels',
        account.token,
        { name: 'Owned label' }
      );
      const foreignLabelResponse = await taskRequest(
        'POST',
        '/api/labels',
        otherAccount.token,
        { name: 'Foreign label' }
      );
      expect(ownLabelResponse.status).toBe(201);
      expect(foreignLabelResponse.status).toBe(201);
      const ownLabelId = labelId(ownLabelResponse.body);
      const foreignLabelId = labelId(foreignLabelResponse.body);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await taskRequest(
          'POST',
          `/api/tasks/${task.id}/labels`,
          account.token,
          { labelIds: [ownLabelId] }
        );
        expect(response.status).toBe(200);
      }
      expect(
        await prisma.taskLabel.count({
          where: { taskId: task.id, labelId: ownLabelId },
        })
      ).toBe(1);

      const listedLabels = await taskRequest(
        'GET',
        `/api/tasks/${task.id}/labels`,
        account.token
      );
      expect(listedLabels.status).toBe(200);
      expect(listedLabels.body).toMatchObject([
        { id: ownLabelId, name: 'Owned label' },
      ]);

      for (const [taskId, labelIds] of [
        [task.id, [foreignLabelId]],
        [foreignTask.id, [ownLabelId]],
      ] as const) {
        const response = await taskRequest(
          'POST',
          `/api/tasks/${taskId}/labels`,
          account.token,
          { labelIds }
        );
        expect(response.status).toBe(404);
      }
      expect(
        await prisma.taskLabel.count({
          where: {
            OR: [
              { taskId: task.id, labelId: foreignLabelId },
              { taskId: foreignTask.id, labelId: ownLabelId },
            ],
          },
        })
      ).toBe(0);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await taskRequest(
          'DELETE',
          `/api/tasks/${task.id}/labels/${ownLabelId}`,
          account.token
        );
        expect(response.status).toBe(200);
      }
      expect(
        await prisma.taskLabel.count({
          where: { taskId: task.id, labelId: ownLabelId },
        })
      ).toBe(0);
    });
  });

  function addCalendarDays(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days))
      .toISOString()
      .slice(0, 10);
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
});
