import { expect, type Locator, type Page } from '@playwright/test';
import { apiBaseUrl, baseUrl, uniqueIdentity } from './auth';
import {
  deleteTaskRows,
  patchTaskRow,
  profileForUser,
  recordCreatedUser,
  serviceRoleRows,
  taskRowsForUser,
} from './database';

/** Days after today that the dashboard asks for (`?days=7`), so today plus seven more. */
export const upcomingDays = 7;
/** dashboard_task_limit when a user has no settings row. */
const defaultTaskLimit = 5;
/** The seeded fixtures whose dates are relative to the day the seed ran. */
const relativeFixturePrefix = 'Filter fixture ';
const maxSeedAgeMs = 24 * 60 * 60 * 1000;

export type DayGroupKey = 'today' | 'tomorrow' | 'later';
export const dayGroups: readonly DayGroupKey[] = ['today', 'tomorrow', 'later'];

/** A task as the dashboard shows it: its id (from the edit link) and title. */
export type ShownTask = { id: number; title: string };

type DashboardTaskRow = {
  task_id: number;
  title: string;
  due_date: string | null;
  deadline: string | null;
  created_at: string;
  project: { is_archived: boolean; deleted_at: string | null } | null;
};

const dashboardColumns =
  'task_id,title,due_date,deadline,created_at,project:tbl_project(is_archived,deleted_at)';

/** YYYY-MM-DD for `instant` in `timeZone`, the way the API and the page work out "today". */
export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000
  );
}

/** The badge text for an overdue deadline: calendar days late in the user's timezone. */
export function overdueLabel(
  deadline: string,
  now: Date,
  timeZone: string
): string {
  const days = Math.max(
    0,
    daysBetween(
      localDate(new Date(deadline), timeZone),
      localDate(now, timeZone)
    )
  );
  if (days === 0) return 'Due earlier today';
  return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
}

/** Tasks in archived or deleted projects never reach the dashboard. */
function inVisibleProject(row: DashboardTaskRow): boolean {
  return (
    !row.project ||
    (!row.project.is_archived && row.project.deleted_at === null)
  );
}

export type DashboardUser = {
  userId: string;
  timeZone: string;
  taskLimit: number;
};

export async function dashboardUser(email: string): Promise<DashboardUser> {
  const profile = await profileForUser(email);
  const settings = await serviceRoleRows<{ dashboard_task_limit: number }>(
    'tbl_user_setting',
    new URLSearchParams({
      select: 'dashboard_task_limit',
      user_id: `eq.${profile.user_id}`,
    })
  );
  return {
    userId: profile.user_id,
    timeZone: profile.timezone ?? 'UTC',
    taskLimit: settings[0]?.dashboard_task_limit ?? defaultTaskLimit,
  };
}

/**
 * Fails with a clear message when the dashboard seed is missing or more than a day old: its
 * due dates and deadlines are relative to the day it ran, and re-seeding does not move them.
 */
export async function expectFreshDashboardSeed(
  userId: string,
  now = new Date()
): Promise<void> {
  const rows = await serviceRoleRows<{ created_at: string }>(
    'tbl_task',
    new URLSearchParams({
      select: 'created_at',
      user_id: `eq.${userId}`,
      title: `like.${relativeFixturePrefix}*`,
      deleted_at: 'is.null',
      order: 'created_at.asc',
      limit: '1',
    })
  );
  const reseed =
    'Reset and reseed the local database: npm run supabase:local:reset, then npm run supabase:local:seed.';
  if (!rows.length) {
    throw new Error(
      `The dashboard seed ("${relativeFixturePrefix}…" tasks) is missing. ${reseed}`
    );
  }
  const seededAt = new Date(rows[0].created_at);
  const ageMs = now.getTime() - seededAt.getTime();
  if (ageMs > maxSeedAgeMs) {
    const hours = Math.floor(ageMs / 3_600_000);
    throw new Error(
      `The dashboard seed is ${hours} hours old (seeded ${seededAt.toISOString()}); ` +
        `its dates are relative to the seed day, so it must be less than one day old. ${reseed}`
    );
  }
}

/**
 * What GET /api/dashboard/current-upcoming-tasks should return, read straight from the
 * database: open tasks due from today through `upcomingDays` later, split into day groups.
 */
export async function expectedCurrentUpcoming(
  user: DashboardUser,
  now = new Date()
): Promise<Record<DayGroupKey, ShownTask[]>> {
  const today = localDate(now, user.timeZone);
  const tomorrow = addDays(today, 1);
  const query = new URLSearchParams({
    select: dashboardColumns,
    user_id: `eq.${user.userId}`,
    is_done: 'eq.false',
    deleted_at: 'is.null',
    order: 'due_date.asc,created_at.desc,task_id.asc',
  });
  query.append('due_date', `gte.${today}`);
  query.append('due_date', `lte.${addDays(today, upcomingDays)}`);
  const rows = (
    await serviceRoleRows<DashboardTaskRow>('tbl_task', query)
  ).filter(inVisibleProject);

  const groups: Record<DayGroupKey, ShownTask[]> = {
    today: [],
    tomorrow: [],
    later: [],
  };
  for (const row of rows) {
    const key: DayGroupKey =
      row.due_date === today
        ? 'today'
        : row.due_date === tomorrow
          ? 'tomorrow'
          : 'later';
    groups[key].push({ id: Number(row.task_id), title: row.title });
  }
  return groups;
}

/** Caps the groups at the user's widget limit, in group order, as the page does. */
export function limitGroups(
  groups: Record<DayGroupKey, ShownTask[]>,
  limit: number
): Record<DayGroupKey, ShownTask[]> {
  let room = limit;
  const limited = { today: [], tomorrow: [], later: [] } as Record<
    DayGroupKey,
    ShownTask[]
  >;
  for (const key of dayGroups) {
    limited[key] = groups[key].slice(0, room);
    room -= limited[key].length;
  }
  return limited;
}

export type OverdueTask = ShownTask & { deadline: string };

/** What GET /api/dashboard/overdue-tasks should return: open tasks past their deadline, oldest first. */
export async function expectedOverdue(
  userId: string,
  now = new Date(),
  otherUsers = false
): Promise<OverdueTask[]> {
  const query = new URLSearchParams({
    select: dashboardColumns,
    user_id: otherUsers ? `neq.${userId}` : `eq.${userId}`,
    is_done: 'eq.false',
    deleted_at: 'is.null',
    order: 'deadline.asc,created_at.desc,task_id.asc',
  });
  query.append('deadline', 'not.is.null');
  query.append('deadline', `lt.${now.toISOString()}`);
  return (await serviceRoleRows<DashboardTaskRow>('tbl_task', query))
    .filter(inVisibleProject)
    .map((row) => ({
      id: Number(row.task_id),
      title: row.title,
      deadline: row.deadline!,
    }));
}

/**
 * Signs up a brand-new account through the API and records it so global teardown (and the
 * spec's afterEach) deletes it. It has an Inbox but no tasks.
 */
export async function createFreshAccount(): Promise<{
  email: string;
  password: string;
  userId: string;
}> {
  const { username, email } = uniqueIdentity();
  const password = 'E2e-test-password-2026';
  const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      confirmPassword: password,
      timezone: 'Asia/Manila',
    }),
  });
  if (response.status !== 201) {
    throw new Error(
      `Could not sign up a fresh E2E account (${response.status})`
    );
  }
  const { userId } = (await response.json()) as { userId: string };
  recordCreatedUser(userId);
  return { email, password, userId };
}

/** Completes a task through PUT /api/tasks/:id, as the task list's checkbox does. */
export async function completeTaskThroughApi(
  token: string,
  taskId: number
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isDone: true }),
  });
  if (response.status !== 200) {
    throw new Error(`Could not complete task ${taskId} (${response.status})`);
  }
}

/** Every task row a user owns, saved before a test so afterEach can put it back. */
export type TaskSnapshot = Record<string, unknown>[];

export async function snapshotTasks(userId: string): Promise<TaskSnapshot> {
  return taskRowsForUser(userId);
}

/**
 * Puts the user's tasks back as they were: removes rows added since (such as the next
 * occurrence of a completed recurring task) and rewrites any row that changed.
 */
export async function restoreTasks(
  userId: string,
  snapshot: TaskSnapshot
): Promise<void> {
  const saved = new Map(snapshot.map((row) => [Number(row['task_id']), row]));
  const current = await taskRowsForUser(userId);
  await deleteTaskRows(
    userId,
    current.map((row) => Number(row['task_id'])).filter((id) => !saved.has(id))
  );
  for (const row of current) {
    const id = Number(row['task_id']);
    const original = saved.get(id);
    if (!original || JSON.stringify(original) === JSON.stringify(row)) continue;
    const { task_id: _id, ...values } = original;
    await patchTaskRow(id, values);
  }
}

/** Opens /dashboard and waits until both sections have finished loading. */
export async function openDashboard(page: Page): Promise<void> {
  await page.goto(`${baseUrl}/dashboard`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' })
  ).toBeVisible();
  await expect(currentUpcomingSection(page).locator('.summary')).toBeVisible();
  await expect(
    overdueSection(page).getByRole('list', { name: 'Overdue tasks' })
  ).toBeVisible();
}

export function currentUpcomingSection(page: Page): Locator {
  return page.locator('app-current-upcoming-tasks');
}

export function overdueSection(page: Page): Locator {
  return page.locator('app-overdue-tasks');
}

export function dayGroup(page: Page, key: DayGroupKey): Locator {
  return currentUpcomingSection(page).locator(`[data-group="${key}"]`);
}

/** The tasks listed under `container`, in page order, identified by their edit links. */
export async function shownTasks(container: Locator): Promise<ShownTask[]> {
  return container.locator('li.task').evaluateAll((items) =>
    items.map((item) => {
      const title = item.querySelector('.title');
      const href = title?.getAttribute('href') ?? '';
      const id = Number(href.match(/\/tasks\/(\d+)\/edit/)?.[1] ?? NaN);
      return { id, title: title?.textContent?.trim() ?? '' };
    })
  );
}
