import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import {
  TASK_KEYS,
  apiFor,
  createProject,
  createTask,
  projectTasks,
  type App,
  type ApiTask,
} from './support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Task CRUD API regression', () => {
  let app: App;
  let prisma: typeof import('../../../backend/src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../../backend/src/app'),
      import('../../../backend/src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('creates, lists, updates and deletes a task in a new project through the API', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Regression tasks');

    // Create
    const created = await createTask(api, {
      projectId,
      title: 'Write the report',
      description: 'Chapter 1',
      priority: 'high',
    });
    expect(Object.keys(created).sort()).toEqual(TASK_KEYS);
    expect(created).toMatchObject({
      projectId,
      title: 'Write the report',
      description: 'Chapter 1',
      priority: 'high',
      dueDate: null,
      deadline: null,
      isDone: false,
      doneAt: null,
      labels: [],
    });

    // List and get
    expect((await projectTasks(api, projectId)).map((t) => t.id)).toEqual([
      created.id,
    ]);
    const fetched = await api.get(`/api/tasks/${created.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toMatchObject({
      id: created.id,
      title: 'Write the report',
    });

    // Update
    const updated = await api.put(`/api/tasks/${created.id}`, {
      title: 'Write the final report',
      description: null,
      priority: 'low',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      taskId: created.id,
      message: 'Task updated successfully',
    });
    const afterUpdate = (await api.get(`/api/tasks/${created.id}`))
      .body as ApiTask;
    expect(afterUpdate).toMatchObject({
      title: 'Write the final report',
      description: null,
      priority: 'low',
    });

    // Delete (soft): gone from the API, row kept with deleted_at
    const deleted = await api.delete(`/api/tasks/${created.id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ message: 'Task deleted successfully' });
    expect((await api.get(`/api/tasks/${created.id}`)).status).toBe(404);
    expect(await projectTasks(api, projectId)).toEqual([]);
    const row = await prisma.task.findUnique({ where: { id: created.id } });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid task input and hides tasks from other users', async () => {
    const owner = await registerAndLoginAs(app);
    const other = await loginAs(app, testSupabase!);
    const api = apiFor(app, owner.token);
    const otherApi = apiFor(app, other.token);
    const projectId = await createProject(api, 'Private');
    const task = await createTask(api, { projectId, title: 'Mine' });

    expect(
      (await api.post('/api/tasks', { projectId, title: '   ' })).status
    ).toBe(400);
    expect(
      (
        await api.post('/api/tasks', {
          projectId,
          title: 'x',
          priority: 'urgent',
        })
      ).status
    ).toBe(400);
    expect((await api.put(`/api/tasks/${task.id}`, {})).status).toBe(400);
    expect((await api.get('/api/tasks/abc')).status).toBe(400);
    expect((await api.get('/api/tasks/999999999')).status).toBe(404);

    // Another user cannot see, change or delete it, or add tasks to the owner's project.
    expect((await otherApi.get(`/api/tasks/${task.id}`)).status).toBe(404);
    expect(
      (await otherApi.put(`/api/tasks/${task.id}`, { title: 'Hijacked' }))
        .status
    ).toBe(404);
    expect((await otherApi.delete(`/api/tasks/${task.id}`)).status).toBe(404);
    expect(
      (await otherApi.post('/api/tasks', { projectId, title: 'Intruder' }))
        .status
    ).toBe(404);
    expect(
      ((await otherApi.get('/api/tasks?status=all')).body as ApiTask[]).map(
        (t) => t.id
      )
    ).not.toContain(task.id);
    expect((await api.get(`/api/tasks/${task.id}`)).body).toMatchObject({
      title: 'Mine',
    });

    // Without a token
    expect((await apiFor(app, 'not-a-token').get('/api/tasks')).status).toBe(
      401
    );
  });

  it('moves tasks to the Inbox when their project is deleted, and project CRUD still works', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Short-lived');
    const first = await createTask(api, { projectId, title: 'First' });
    const second = await createTask(api, { projectId, title: 'Second' });

    const deleted = await api.delete(`/api/projects/${projectId}`);
    expect(deleted.status).toBe(204);
    expect(deleted.headers['x-moved-task-count']).toBe('2');

    // The tasks now live in the Inbox; the project is gone but its row is kept.
    const inboxTasks = await projectTasks(api, owner.inboxProjectId);
    expect(inboxTasks.map((t) => t.id).sort((a, b) => a - b)).toEqual([
      first.id,
      second.id,
    ]);
    expect((await api.get(`/api/projects/${projectId}`)).status).toBe(404);
    const projectRow = await prisma.project.findUnique({
      where: { id: projectId },
    });
    expect(projectRow?.deletedAt).toBeInstanceOf(Date);

    // Project CRUD and the Inbox rules are unchanged by the tasks table.
    const list = await api.get('/api/projects');
    expect(list.status).toBe(200);
    expect((list.body as { id: number }[]).map((p) => p.id)).toEqual([
      owner.inboxProjectId,
    ]);
    expect(
      (await api.delete(`/api/projects/${owner.inboxProjectId}`)).status
    ).toBe(403);
    const renamed = await api.patch(
      `/api/projects/${await createProject(api, 'Again')}`,
      {
        name: 'Again, renamed',
      }
    );
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Again, renamed' });
  });

  it('still signs up with exactly one Inbox and can add a task to it', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);

    const inboxes = await prisma.project.findMany({
      where: { userId: account.id, isInbox: true, deletedAt: null },
    });
    expect(inboxes.map((p) => p.id)).toEqual([account.inboxProjectId]);

    const task = await createTask(api, { title: 'Straight to the Inbox' });
    expect(task.projectId).toBe(account.inboxProjectId);
  });
});
