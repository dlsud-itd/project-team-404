import { expect, test, type Page } from '@playwright/test';
import { logIn } from '../support/auth';
import {
  deleteCreatedUsers,
  restoreSeedAccount,
  taskRow,
} from '../support/database';
import {
  completeTaskThroughApi,
  createFreshAccount,
  dashboardUser,
  expectedOverdue,
  expectFreshDashboardSeed,
  openDashboard,
  overdueLabel,
  overdueSection,
  restoreTasks,
  shownTasks,
  snapshotTasks,
  type DashboardUser,
  type OverdueTask,
  type TaskSnapshot,
} from '../support/dashboard';
import { apiToken } from '../support/projects';
import { seedAccounts } from '../support/seed-data';

// Harvey's seeded fixtures have deadlines a few days before the seed date.
const [, harvey] = seedAccounts;

let user: DashboardUser;
let seededTasks: TaskSnapshot;

test.beforeAll(async () => {
  user = await dashboardUser(harvey.email);
  await expectFreshDashboardSeed(user.userId);
  seededTasks = await snapshotTasks(user.userId);
});

test.afterEach(async () => {
  try {
    await restoreTasks(user.userId, seededTasks);
    expect(await snapshotTasks(user.userId)).toEqual(seededTasks);
  } finally {
    try {
      await deleteCreatedUsers();
    } finally {
      await restoreSeedAccount(harvey.email);
    }
  }
});

function overdueList(page: Page) {
  return overdueSection(page).getByRole('list', { name: 'Overdue tasks' });
}

/** Opens the dashboard and returns the task ids the API sent for Overdue. */
async function openAndCaptureIds(page: Page): Promise<number[]> {
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().includes('/api/dashboard/overdue-tasks') &&
      candidate.request().method() === 'GET'
  );
  await openDashboard(page);
  const body = (await (await response).json()) as { tasks: { id: number }[] };
  return body.tasks.map((task) => task.id);
}

/** Checks the list, its order, its count and each "N days overdue" badge against the database. */
async function expectOverdueToMatch(
  page: Page,
  expected: OverdueTask[],
  now: Date
): Promise<void> {
  const shown = expected.slice(0, user.taskLimit);
  expect(
    await shownTasks(overdueList(page)),
    'overdue tasks, oldest first'
  ).toEqual(shown.map(({ id, title }) => ({ id, title })));
  const badges = overdueList(page).locator('li.task app-overdue-badge');
  await expect(badges).toHaveText(
    shown.map((task) => overdueLabel(task.deadline, now, user.timeZone))
  );
  const count = expected.length;
  await expect(
    overdueSection(page).getByRole('heading', { level: 2 })
  ).toContainText(`${count} overdue ${count === 1 ? 'task' : 'tasks'}`);
}

test('E2E-OVD-01: the overdue list matches a service-role query, oldest first, with days overdue', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  const now = new Date();
  const expected = await expectedOverdue(user.userId, now);
  expect(
    expected.length,
    'the dashboard seed should give Harvey open tasks past their deadline'
  ).toBeGreaterThan(0);
  const deadlines = expected.map((task) => Date.parse(task.deadline));
  expect(deadlines, 'oldest deadline first').toEqual(
    [...deadlines].sort((a, b) => a - b)
  );

  const apiIds = await openAndCaptureIds(page);
  expect(apiIds, 'API tasks, in order').toEqual(
    expected.map((task) => task.id)
  );
  await expectOverdueToMatch(page, expected, now);

  await page.reload();
  await expect(overdueList(page)).toBeVisible();
  const afterReload = new Date();
  await expectOverdueToMatch(
    page,
    await expectedOverdue(user.userId, afterReload),
    afterReload
  );
});

test('E2E-OVD-02: an overdue task completed through the API is gone after a reload', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  await openDashboard(page);
  const [target] = await expectedOverdue(user.userId);
  expect(
    target,
    'Harvey should have an overdue task to complete'
  ).toBeDefined();
  expect(
    (await shownTasks(overdueList(page))).map((task) => task.id)
  ).toContain(target.id);

  await completeTaskThroughApi(await apiToken(harvey), target.id);
  expect((await taskRow(target.id))?.['is_done']).toBe(true);

  await page.reload();
  await expect(overdueList(page)).toBeVisible();
  const now = new Date();
  // A recurring task's next occurrence keeps the title, so check by id.
  expect(
    (await shownTasks(overdueList(page))).map((task) => task.id)
  ).not.toContain(target.id);
  await expectOverdueToMatch(
    page,
    await expectedOverdue(user.userId, now),
    now
  );
});

test('E2E-OVD-03: a freshly created account shows the overdue empty state', async ({
  page,
}) => {
  const account = await createFreshAccount();
  expect(await expectedOverdue(account.userId)).toEqual([]);

  await logIn(page, account.email, account.password);
  await openDashboard(page);

  await expect(overdueList(page).locator('li.task')).toHaveCount(0);
  await expect(
    overdueList(page).getByText('Nothing here', { exact: true })
  ).toBeVisible();
  await expect(
    overdueSection(page).getByRole('heading', { level: 2 })
  ).toContainText('0 overdue tasks');
});

test("E2E-OVD-04: another seeded user's overdue tasks are never shown", async ({
  page,
}) => {
  const now = new Date();
  const others = await expectedOverdue(user.userId, now, true);
  expect(
    others.length,
    'the seed should give other users overdue tasks to leave out'
  ).toBeGreaterThan(0);
  const otherIds = new Set(others.map((task) => task.id));
  const ownTitles = new Set(
    (await expectedOverdue(user.userId, now)).map((task) => task.title)
  );

  await logIn(page, harvey.email, harvey.password);
  const apiIds = await openAndCaptureIds(page);

  expect(apiIds.filter((id) => otherIds.has(id))).toEqual([]);
  const shown = await shownTasks(overdueList(page));
  expect(shown.filter((task) => otherIds.has(task.id))).toEqual([]);
  for (const title of new Set(others.map((task) => task.title))) {
    if (ownTitles.has(title)) continue;
    await expect(
      overdueList(page).getByText(title, { exact: true })
    ).toHaveCount(0);
  }
});
