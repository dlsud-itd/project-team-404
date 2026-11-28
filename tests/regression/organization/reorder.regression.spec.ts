import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createProject, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Task and project ordering regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('appends new tasks, accepts every legacy orderBy value, and preserves project order', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const projectId = await createProject(api, 'Task ordering regression');
    const secondProjectId = await createProject(api, 'Second project');
    const first = await createTask(api, {
      projectId,
      title: 'First task',
      dueDate: '2026-01-03',
      scheduledDate: '2025-12-03',
    });
    const second = await createTask(api, {
      projectId,
      title: 'Second task',
      dueDate: '2026-01-01',
      scheduledDate: '2025-12-01',
    });

    const reorderedTasks = [second.id, first.id];
    expect(
      (
        await api.put('/api/tasks/reorder', {
          projectId,
          taskIds: reorderedTasks,
        })
      ).status
    ).toBe(200);

    const reorderedProjects = [secondProjectId, projectId];
    expect(
      (
        await api.put('/api/projects/reorder', {
          projectIds: reorderedProjects,
        })
      ).status
    ).toBe(200);

    const created = await createTask(api, {
      projectId,
      title: 'New task',
    });
    const positions = await api.get(
      `/api/tasks?projectId=${projectId}&status=all&orderBy=position`
    );
    expect(positions.status).toBe(200);
    expect((positions.body as { id: number }[]).map(({ id }) => id)).toEqual([
      ...reorderedTasks,
      created.id,
    ]);

    for (const orderBy of [
      'dueDate',
      'scheduledDate',
      'priority',
      'title',
      'position',
      'createdAt',
      'updatedAt',
    ]) {
      const response = await api.get(
        `/api/tasks?projectId=${projectId}&status=all&orderBy=${orderBy}`
      );
      expect(response.status, `orderBy=${orderBy}`).toBe(200);
      expect(
        (response.body as { id: number }[]).map(({ id }) => id).sort()
      ).toEqual([first.id, second.id, created.id].sort());
    }

    const projectList = await api.get('/api/projects');
    expect(projectList.status).toBe(200);
    expect((projectList.body as { id: number }[]).map(({ id }) => id)).toEqual([
      account.inboxProjectId,
      ...reorderedProjects,
    ]);
    const tasksAfterProjectReorder = await api.get(
      `/api/tasks?projectId=${projectId}&status=all&orderBy=position`
    );
    expect(
      (tasksAfterProjectReorder.body as { id: number }[]).map(({ id }) => id)
    ).toEqual([...reorderedTasks, created.id]);
  });
});
