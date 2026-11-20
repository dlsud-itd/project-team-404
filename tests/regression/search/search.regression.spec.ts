import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createProject, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type SearchItem = { id: number };
type SearchResponse = {
  tasks: { items: SearchItem[]; total: number };
  projects: { items: SearchItem[]; total: number };
};

integrationDescribe('Sprint 5 search regression', () => {
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

  it('scopes search to active caller data and leaves dashboard results unchanged', async () => {
    const owner = await registerAndLoginAs(app);
    const other = await registerAndLoginAs(app);
    const ownerApi = apiFor(app, owner.token);
    const otherApi = apiFor(app, other.token);
    const term = 'sprint5searchregression';
    const activeProject = await createProject(
      ownerApi,
      `${term} active project`
    );
    const archivedProject = await createProject(
      ownerApi,
      `${term} archived project`
    );
    const deletedProject = await createProject(
      ownerApi,
      `${term} deleted project`
    );
    const foreignProject = await createProject(
      otherApi,
      `${term} foreign project`
    );
    const dueDate = addDays(localDate(new Date(), owner.timezone), 1);
    const activeTask = await createTask(ownerApi, {
      projectId: activeProject,
      title: `${term} active task`,
      dueDate,
    });
    const archivedTask = await createTask(ownerApi, {
      projectId: activeProject,
      title: `${term} archived task`,
    });
    const taskInArchivedProject = await createTask(ownerApi, {
      projectId: archivedProject,
      title: `${term} task in archived project`,
    });
    const deletedTask = await createTask(ownerApi, {
      projectId: activeProject,
      title: `${term} deleted task`,
    });
    const taskInDeletedProject = await createTask(ownerApi, {
      projectId: deletedProject,
      title: `${term} task in deleted project`,
    });
    const foreignTask = await createTask(otherApi, {
      projectId: foreignProject,
      title: `${term} foreign task`,
    });

    expect(
      (
        await ownerApi.put(`/api/tasks/${archivedTask.id}/archive`, {
          isArchived: true,
        })
      ).status
    ).toBe(200);
    expect(
      (
        await ownerApi.put(`/api/projects/${archivedProject}/archive`, {
          isArchived: true,
        })
      ).status
    ).toBe(200);
    expect((await ownerApi.delete(`/api/tasks/${deletedTask.id}`)).status).toBe(
      200
    );
    await prisma.project.update({
      where: { id: deletedProject },
      data: { deletedAt: new Date() },
    });

    const dashboardBefore = await ownerApi.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    const defaultSearch = await ownerApi.get(
      `/api/search?q=${encodeURIComponent(term)}`
    );
    const archivedSearch = await ownerApi.get(
      `/api/search?q=${encodeURIComponent(term)}&includeArchived=true`
    );
    const dashboardAfter = await ownerApi.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );

    expect(dashboardBefore.status).toBe(200);
    expect(
      (dashboardBefore.body as { tasks: SearchItem[] }).tasks.map(
        ({ id }) => id
      )
    ).toContain(activeTask.id);
    expect(dashboardAfter.body).toEqual(dashboardBefore.body);
    expect(defaultSearch.status).toBe(200);
    const defaultResults = defaultSearch.body as SearchResponse;
    expect(defaultResults.tasks.items.map(({ id }) => id)).toEqual([
      activeTask.id,
    ]);
    expect(defaultResults.projects.items.map(({ id }) => id)).toEqual([
      activeProject,
    ]);

    expect(archivedSearch.status).toBe(200);
    const archivedResults = archivedSearch.body as SearchResponse;
    expect(
      archivedResults.tasks.items.map(({ id }) => id).sort((a, b) => a - b)
    ).toEqual(
      [activeTask.id, archivedTask.id, taskInArchivedProject.id].sort(
        (a, b) => a - b
      )
    );
    expect(
      archivedResults.projects.items.map(({ id }) => id).sort((a, b) => a - b)
    ).toEqual([activeProject, archivedProject].sort((a, b) => a - b));
    for (const omittedId of [
      deletedTask.id,
      taskInDeletedProject.id,
      foreignTask.id,
    ]) {
      expect(archivedResults.tasks.items.map(({ id }) => id)).not.toContain(
        omittedId
      );
    }
    expect(archivedResults.projects.items.map(({ id }) => id)).not.toContain(
      deletedProject
    );
    expect(archivedResults.tasks.total).toBe(3);
    expect(archivedResults.projects.total).toBe(2);
  });
});

function localDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
