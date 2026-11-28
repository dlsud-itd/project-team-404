import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import {
  apiFor,
  createProject,
  createTask,
  type ApiTask,
  type App,
} from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Sprint 5 archive regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('preserves Sprint 2 project archive behavior and restores task data unchanged', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const projectId = await createProject(api, 'Archive compatibility');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: account.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const scheduledDate = today;
    const dueDate = addDays(today, 1);
    const task = await createTask(api, {
      projectId,
      title: 'Restored task retains dates',
      scheduledDate,
      dueDate,
    });
    const labelResponse = await api.post('/api/labels', {
      name: 'Restored task label',
      color: '#1255AA',
    });
    expect(labelResponse.status).toBe(201);
    const labelId = (labelResponse.body as { id: number }).id;
    expect(
      (
        await api.post(`/api/tasks/${task.id}/labels`, {
          labelIds: [labelId],
        })
      ).status
    ).toBe(200);

    const taskBefore = await api.get(`/api/tasks/${task.id}`);
    const tasksBefore = await api.get(
      `/api/tasks?projectId=${projectId}&status=all`
    );
    const labelsBefore = await api.get('/api/labels');
    const dashboardBefore = await api.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    expect(taskBefore.status).toBe(200);
    expect((tasksBefore.body as ApiTask[]).map(({ id }) => id)).toEqual([
      task.id,
    ]);
    expect(
      (dashboardBefore.body as { tasks: { id: number }[] }).tasks.map(
        ({ id }) => id
      )
    ).toContain(task.id);

    const archive = await api.put(`/api/projects/${projectId}/archive`, {
      isArchived: true,
    });
    expect(archive.status).toBe(200);
    expect(archive.body).toMatchObject({
      isArchived: true,
      archivedAt: expect.any(String),
    });
    const archivedProjects = await api.get('/api/projects?isArchived=true');
    expect(
      (archivedProjects.body as { id: number }[]).map(({ id }) => id)
    ).toContain(projectId);
    expect(
      (await api.get(`/api/tasks?projectId=${projectId}&status=all`)).body
    ).toEqual([]);
    expect(
      (await api.get('/api/dashboard/current-upcoming-tasks?days=7')).body
    ).toMatchObject({
      tasks: expect.not.arrayContaining([
        expect.objectContaining({ id: task.id }),
      ]),
    });
    expect((await api.get('/api/labels')).body).toEqual(labelsBefore.body);

    const restore = await api.put(`/api/projects/${projectId}/archive`, {
      isArchived: false,
    });
    expect(restore.status).toBe(200);
    expect(restore.body).toMatchObject({
      isArchived: false,
      archivedAt: null,
    });
    const activeProjects = await api.get('/api/projects?isArchived=false');
    expect(
      (activeProjects.body as { id: number }[]).map(({ id }) => id)
    ).toContain(projectId);

    const taskAfter = await api.get(`/api/tasks/${task.id}`);
    const labelsAfter = await api.get('/api/labels');
    const dashboardAfter = await api.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    expect(taskAfter.body).toEqual(taskBefore.body);
    expect(labelsAfter.body).toEqual(labelsBefore.body);
    expect(dashboardAfter.body).toEqual(dashboardBefore.body);
    expect(taskAfter.body).toMatchObject({
      scheduledDate,
      dueDate,
      labels: [{ id: labelId, name: 'Restored task label' }],
    });
  });
});

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
