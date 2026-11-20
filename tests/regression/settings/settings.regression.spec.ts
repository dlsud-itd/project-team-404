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
  type App,
  type ApiTask,
} from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Sprint 5 settings compatibility regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('preserves no-limit dashboard and project items and Profile updates', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const firstProject = await createProject(api, 'Settings regression first');
    const secondProject = await createProject(
      api,
      'Settings regression second'
    );
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: account.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const dueDate = addDays(today, 1);
    const firstTask = await createTask(api, {
      projectId: firstProject,
      title: 'First task for legacy dashboard',
      dueDate,
    });
    const secondTask = await createTask(api, {
      projectId: secondProject,
      title: 'Second task for legacy dashboard',
      dueDate,
    });

    const dashboard = await api.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    const projects = await api.get('/api/projects');

    expect(dashboard.status).toBe(200);
    expect(dashboard.body).toMatchObject({ total: 2 });
    expect(
      (dashboard.body as { tasks: ApiTask[] }).tasks.map(({ id }) => id)
    ).toEqual([firstTask.id, secondTask.id]);
    expect(projects.status).toBe(200);
    expect(Array.isArray(projects.body)).toBe(true);
    expect((projects.body as { id: number }[]).map(({ id }) => id)).toEqual([
      account.inboxProjectId,
      firstProject,
      secondProject,
    ]);

    const profileUpdate = await api.put('/api/auth/me', {
      username: `sprint5_${account.username}`,
      timezone: 'Europe/London',
    });
    expect(profileUpdate.status).toBe(200);
    expect(profileUpdate.body).toMatchObject({
      id: account.id,
      username: `sprint5_${account.username}`,
      timezone: 'Europe/London',
    });
    expect(await api.get('/api/auth/me')).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        id: account.id,
        username: `sprint5_${account.username}`,
        timezone: 'Europe/London',
      }),
    });
  });
});

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
