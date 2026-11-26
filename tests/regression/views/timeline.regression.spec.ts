import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createProject, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Timeline view regression', () => {
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

  it('never returns deleted, archived, archived-project, or another user’s tasks', async () => {
    const account = await registerAndLoginAs(app);
    const foreignAccount = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const foreignApi = apiFor(app, foreignAccount.token);
    const projectId = await createProject(api, 'Timeline regression');
    const archivedProjectId = await createProject(
      api,
      'Archived timeline regression'
    );
    const foreignProjectId = await createProject(
      foreignApi,
      'Foreign timeline regression'
    );
    const dueDate = addDays(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: account.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
      1
    );
    const visible = await createTask(api, {
      projectId,
      title: 'Visible timeline task',
      dueDate,
    });
    const archived = await createTask(api, {
      projectId,
      title: 'Archived timeline task',
      dueDate,
    });
    const deleted = await createTask(api, {
      projectId,
      title: 'Deleted timeline task',
      dueDate,
    });
    const archivedProjectTask = await createTask(api, {
      projectId: archivedProjectId,
      title: 'Archived project timeline task',
      dueDate,
    });
    const foreign = await createTask(foreignApi, {
      projectId: foreignProjectId,
      title: 'Foreign timeline task',
      dueDate,
    });
    await Promise.all([
      prisma.task.update({
        where: { id: archived.id },
        data: { archivedAt: new Date() },
      }),
      prisma.task.update({
        where: { id: deleted.id },
        data: { deletedAt: new Date() },
      }),
      prisma.project.update({
        where: { id: archivedProjectId },
        data: { isArchived: true, archivedAt: new Date() },
      }),
    ]);

    const response = await api.get(
      `/api/tasks/timeline?from=${addDays(dueDate, -1)}&to=${addDays(dueDate, 1)}`
    );
    expect(response.status).toBe(200);
    const projects = (
      response.body as {
        projects: { bars: { id: number }[] }[];
      }
    ).projects;
    const returnedIds = projects.flatMap(({ bars }) =>
      bars.map(({ id }) => id)
    );
    expect(returnedIds).toContain(visible.id);
    expect(returnedIds).not.toContain(archived.id);
    expect(returnedIds).not.toContain(deleted.id);
    expect(returnedIds).not.toContain(archivedProjectTask.id);
    expect(returnedIds).not.toContain(foreign.id);
  });
});

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
