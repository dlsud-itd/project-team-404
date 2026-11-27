import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createProject, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Recurring task streak regression', () => {
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

  it('creates exactly one next occurrence in the original series when completed', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const projectId = await createProject(api, 'Streak regression');
    const dueDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: account.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const task = await createTask(api, {
      projectId,
      title: 'Daily recurring task',
      dueDate,
      recurrence: 'daily',
    });
    const initial = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { recurrenceSeriesId: true },
    });
    expect(initial.recurrenceSeriesId).toEqual(expect.any(String));

    expect(
      (await api.put(`/api/tasks/${task.id}`, { isDone: true })).status
    ).toBe(200);
    expect(
      (await api.put(`/api/tasks/${task.id}`, { isDone: true })).status
    ).toBe(200);

    const series = await prisma.task.findMany({
      where: {
        userId: account.id,
        recurrenceSeriesId: initial.recurrenceSeriesId,
        deletedAt: null,
      },
      orderBy: { id: 'asc' },
    });
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      id: task.id,
      recurrenceSeriesId: initial.recurrenceSeriesId,
      isDone: true,
    });
    expect(series[1]).toMatchObject({
      recurrenceSeriesId: initial.recurrenceSeriesId,
      isDone: false,
      dueDate: new Date(`${addDays(dueDate, 1)}T00:00:00.000Z`),
    });
    await expect(
      prisma.taskCompletionEvent.count({
        where: { taskId: task.id, seriesId: initial.recurrenceSeriesId },
      })
    ).resolves.toBe(1);
  });
});

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
