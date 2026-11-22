import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
type SeedTaskOptions = {
  title: string;
  recurrence?: Recurrence;
  dueDate?: string;
  isDone?: boolean;
  recurrenceSeriesId?: string;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
};

integrationDescribe('task streaks integration', () => {
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
    vi.useRealTimers();
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

  async function streakRequest(
    path: string,
    token?: string,
    method = 'GET',
    body?: unknown
  ): Promise<TestResponse> {
    return request(app, path, {
      method,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body }),
    });
  }

  async function defaultPriorityId(userId: string): Promise<number> {
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
    return priority.id;
  }

  async function seedTask(
    account: IntegrationAccount,
    options: SeedTaskOptions
  ): Promise<{ id: number; seriesId: string | null }> {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const seriesId =
      options.recurrenceSeriesId ??
      (options.recurrence && options.recurrence !== 'none'
        ? randomUUID()
        : null);
    const rows = await serviceRoleInsert<{ task_id: number }>('tbl_task', {
      user_id: account.id,
      project_id: account.inboxProjectId,
      priority_id: await defaultPriorityId(account.id),
      position: 0,
      board_status: options.isDone ? 'done' : 'todo',
      recurrence_series_id: seriesId,
      title: options.title,
      recurrence: options.recurrence ?? 'daily',
      recurrence_days: [],
      ...(options.dueDate ? { due_date: options.dueDate } : {}),
      is_done: options.isDone ?? false,
      done_at: options.isDone ? new Date().toISOString() : null,
      archived_at: options.archivedAt?.toISOString() ?? null,
      deleted_at: options.deletedAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    });
    const task = rows[0];
    if (!task || typeof task.task_id !== 'number') {
      throw new Error('Service-role task insert returned no task id');
    }
    return { id: task.task_id, seriesId };
  }

  async function seedCompletions(
    account: IntegrationAccount,
    taskId: number,
    seriesId: string,
    dates: string[]
  ): Promise<void> {
    await serviceRoleInsert(
      'tbl_task_completion',
      dates.map((date) => ({
        task_id: taskId,
        user_id: account.id,
        series_id: seriesId,
        completed_on: date,
      }))
    );
  }

  async function serviceRoleInsert<T = unknown>(
    table: 'tbl_task' | 'tbl_task_completion',
    body: unknown
  ): Promise<T[]> {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const response = await fetch(
      new URL(`/rest/v1/${table}`, `${testSupabase.url}/`),
      {
        method: 'POST',
        headers: {
          apikey: testSupabase.serviceRoleKey,
          Authorization: `Bearer ${testSupabase.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Service-role insert into ${table} failed (HTTP ${response.status})`
      );
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : []) as T[];
  }

  async function setTimezone(
    account: IntegrationAccount,
    timezone: string
  ): Promise<void> {
    await prisma.user.update({
      where: { id: account.id },
      data: { timezone },
    });
  }

  async function streakFor(taskId: number, token: string) {
    const response = await streakRequest(`/api/tasks/${taskId}/streak`, token);
    expect(response.status).toBe(200);
    return response.body as Record<string, unknown>;
  }

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

  function periodStart(date: string, monthsBack: number): string {
    const [year, month] = date.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1 - monthsBack, 1))
      .toISOString()
      .slice(0, 10);
  }

  function dashboardStreaks(body: unknown): Array<Record<string, unknown>> {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('streaks' in body) ||
      !Array.isArray(body.streaks)
    ) {
      throw new Error('Expected dashboard response to include a streaks array');
    }
    return body.streaks as Array<Record<string, unknown>>;
  }

  it('counts completed daily occurrences and ignores an open occurrence due tomorrow', async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const length = 5;
    const task = await seedTask(account, {
      title: 'Daily streak with next occurrence',
      recurrence: 'daily',
      dueDate: addDays(today, 1),
    });
    await seedCompletions(
      account,
      task.id,
      task.seriesId!,
      Array.from({ length }, (_, index) => addDays(today, index - length + 1))
    );

    const result = await streakFor(task.id, account.token);

    expect(result).toMatchObject({
      currentStreak: length,
      longestStreak: length,
      lastCompletedOn: today,
      nextOccurrenceOn: addDays(today, 1),
    });
  });

  it('resets the current streak after a missed day while keeping the longest run', async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const task = await seedTask(account, {
      title: 'Daily streak after a missed day',
      recurrence: 'daily',
    });
    await seedCompletions(account, task.id, task.seriesId!, [
      addDays(today, -4),
      addDays(today, -3),
      addDays(today, -2),
      today,
    ]);

    const result = await streakFor(task.id, account.token);

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 3,
      lastCompletedOn: today,
    });
  });

  it('does not count a late completion toward the active streak', async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const task = await seedTask(account, {
      title: 'Late daily completion',
      recurrence: 'daily',
      dueDate: addDays(today, -1),
    });
    await seedCompletions(account, task.id, task.seriesId!, [
      addDays(today, -4),
      addDays(today, -3),
      today,
    ]);

    const result = await streakFor(task.id, account.token);

    expect(result).toMatchObject({
      currentStreak: 0,
      longestStreak: 2,
      lastCompletedOn: today,
    });
  });

  it('counts weekly and monthly completions by recurrence period', async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const weeklyTask = await seedTask(account, {
      title: 'Weekly streak',
      recurrence: 'weekly',
    });
    const monthlyTask = await seedTask(account, {
      title: 'Monthly streak',
      recurrence: 'monthly',
    });
    await Promise.all([
      seedCompletions(account, weeklyTask.id, weeklyTask.seriesId!, [
        addDays(today, -14),
        addDays(today, -7),
        today,
      ]),
      seedCompletions(account, monthlyTask.id, monthlyTask.seriesId!, [
        periodStart(today, 2),
        periodStart(today, 1),
        periodStart(today, 0),
      ]),
    ]);

    const [weekly, monthly] = await Promise.all([
      streakFor(weeklyTask.id, account.token),
      streakFor(monthlyTask.id, account.token),
    ]);

    expect(weekly).toMatchObject({ currentStreak: 3, longestStreak: 3 });
    expect(monthly).toMatchObject({ currentStreak: 3, longestStreak: 3 });
  });

  it("increments today's streak through the task endpoint and creates one next occurrence in the same series", async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const task = await seedTask(account, {
      title: 'Complete today',
      recurrence: 'daily',
      dueDate: today,
    });
    await seedCompletions(account, task.id, task.seriesId!, [
      addDays(today, -2),
      addDays(today, -1),
    ]);

    const completion = await streakRequest(
      `/api/tasks/${task.id}`,
      account.token,
      'PUT',
      { isDone: true }
    );

    expect(completion.status).toBe(200);
    const result = await streakFor(task.id, account.token);
    expect(result).toMatchObject({ currentStreak: 3, longestStreak: 3 });

    const nextOccurrences = await prisma.task.findMany({
      where: {
        userId: account.id,
        recurrenceSeriesId: task.seriesId,
        id: { not: task.id },
        deletedAt: null,
      },
    });
    expect(nextOccurrences).toHaveLength(1);
    expect(nextOccurrences[0]).toMatchObject({
      recurrenceSeriesId: task.seriesId,
      isDone: false,
      dueDate: new Date(`${addDays(today, 1)}T00:00:00.000Z`),
    });
  });

  it('marks a streak at risk only when its due-today occurrence is still open', async () => {
    const account = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const dueToday = await seedTask(account, {
      title: 'Due today and open',
      recurrence: 'daily',
      dueDate: today,
    });
    const dueTomorrow = await seedTask(account, {
      title: 'Due tomorrow and open',
      recurrence: 'daily',
      dueDate: addDays(today, 1),
    });
    const completedToday = await seedTask(account, {
      title: 'Due today and completed',
      recurrence: 'daily',
      dueDate: today,
      isDone: true,
    });
    await Promise.all(
      [dueToday, dueTomorrow, completedToday].map((task) =>
        seedCompletions(account, task.id, task.seriesId!, [
          task === completedToday ? today : addDays(today, -1),
        ])
      )
    );

    const response = await streakRequest(
      '/api/dashboard/streaks',
      account.token
    );
    expect(response.status).toBe(200);
    const byTitle = new Map(
      dashboardStreaks(response.body).map((streak) => [
        streak.title,
        streak.atRisk,
      ])
    );
    expect(byTitle.get('Due today and open')).toBe(true);
    expect(byTitle.get('Due tomorrow and open')).toBe(false);
    expect(byTitle.get('Due today and completed')).toBe(false);
  });

  it('uses each user timezone when completing occurrences across a day boundary', async () => {
    const manilaAccount = await createAccount();
    const farWestAccount = await createAccount();
    await Promise.all([
      setTimezone(manilaAccount, 'Asia/Manila'),
      setTimezone(farWestAccount, 'America/Adak'),
    ]);

    const actualNow = new Date();
    const boundary = new Date(
      Date.UTC(
        actualNow.getUTCFullYear(),
        actualNow.getUTCMonth(),
        actualNow.getUTCDate(),
        18
      )
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(boundary);
    const manilaToday = localDate(boundary, 'Asia/Manila');
    const farWestToday = localDate(boundary, 'America/Adak');
    expect(manilaToday).not.toBe(farWestToday);

    const manilaTask = await seedTask(manilaAccount, {
      title: 'Manila boundary occurrence',
      recurrence: 'daily',
      dueDate: manilaToday,
    });
    const farWestTask = await seedTask(farWestAccount, {
      title: 'Far-west boundary occurrence',
      recurrence: 'daily',
      dueDate: farWestToday,
    });

    for (const [account, task] of [
      [manilaAccount, manilaTask],
      [farWestAccount, farWestTask],
    ] as const) {
      const response = await streakRequest(
        `/api/tasks/${task.id}`,
        account.token,
        'PUT',
        { isDone: true }
      );
      expect(response.status).toBe(200);
    }

    const events = await prisma.taskCompletionEvent.findMany({
      where: { taskId: { in: [manilaTask.id, farWestTask.id] } },
      select: { taskId: true, completedOn: true },
    });
    expect(events).toHaveLength(2);
    expect(
      events
        .find((event) => event.taskId === manilaTask.id)
        ?.completedOn.toISOString()
        .slice(0, 10)
    ).toBe(manilaToday);
    expect(
      events
        .find((event) => event.taskId === farWestTask.id)
        ?.completedOn.toISOString()
        .slice(0, 10)
    ).toBe(farWestToday);
  });

  it('returns a null streak for a non-recurring task', async () => {
    const account = await createAccount();
    const task = await seedTask(account, {
      title: 'One-time task',
      recurrence: 'none',
    });

    const response = await streakRequest(
      `/api/tasks/${task.id}/streak`,
      account.token
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it('lists only active caller series and sorts at-risk streaks first', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const today = localDate(new Date(), account.timezone);
    const atRisk = await seedTask(account, {
      title: 'At-risk active streak',
      recurrence: 'daily',
      dueDate: today,
    });
    const future = await seedTask(account, {
      title: 'Future active streak',
      recurrence: 'daily',
      dueDate: addDays(today, 1),
    });
    const archived = await seedTask(account, {
      title: 'Archived streak',
      recurrence: 'daily',
      archivedAt: new Date(),
    });
    const deleted = await seedTask(account, {
      title: 'Deleted streak',
      recurrence: 'daily',
      deletedAt: new Date(),
    });
    const foreign = await seedTask(otherAccount, {
      title: 'Another user streak',
      recurrence: 'daily',
    });
    await Promise.all([
      seedCompletions(account, atRisk.id, atRisk.seriesId!, [
        addDays(today, -1),
      ]),
      seedCompletions(account, future.id, future.seriesId!, [today]),
      seedCompletions(account, archived.id, archived.seriesId!, [
        addDays(today, -1),
      ]),
      seedCompletions(account, deleted.id, deleted.seriesId!, [
        addDays(today, -1),
      ]),
      seedCompletions(otherAccount, foreign.id, foreign.seriesId!, [
        addDays(today, -1),
      ]),
    ]);

    const response = await streakRequest(
      '/api/dashboard/streaks',
      account.token
    );

    expect(response.status).toBe(200);
    const streaks = dashboardStreaks(response.body);
    expect(streaks.map((streak) => streak.title)).toEqual([
      'At-risk active streak',
      'Future active streak',
    ]);
    expect(streaks[0]).toMatchObject({ atRisk: true });
    expect(streaks[1]).toMatchObject({ atRisk: false });
  });

  it('hides another user’s task and requires authentication', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const foreignTask = await seedTask(otherAccount, {
      title: 'Private task',
      recurrence: 'daily',
    });

    const unauthorized = await streakRequest(
      `/api/tasks/${foreignTask.id}/streak`
    );
    const forbidden = await streakRequest(
      `/api/tasks/${foreignTask.id}/streak`,
      account.token
    );

    expect(unauthorized.status).toBe(401);
    expect(forbidden.status).toBe(404);
  });
});
