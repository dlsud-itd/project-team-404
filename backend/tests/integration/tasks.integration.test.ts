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
    await createAccount();
    const countBefore = await prisma.task.count();
    const routes = [
      { method: 'POST', path: '/api/tasks', body: { title: 'Unauthorized' } },
      { method: 'GET', path: '/api/tasks' },
      { method: 'GET', path: '/api/tasks/1' },
      { method: 'PUT', path: '/api/tasks/1', body: { title: 'Unauthorized' } },
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

    expect(await prisma.task.count()).toBe(countBefore);
  });
});
