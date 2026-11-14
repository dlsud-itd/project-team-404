import { expect, test, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  deleteCreatedUsers,
  restoreSeedAccount,
  taskRow,
} from '../support/database';
import {
  completeTaskThroughApi,
  createFreshAccount,
  currentUpcomingSection,
  dashboardUser,
  dayGroup,
  dayGroups,
  expectedCurrentUpcoming,
  expectFreshDashboardSeed,
  limitGroups,
  openDashboard,
  overdueSection,
  restoreTasks,
  shownTasks,
  snapshotTasks,
  type DashboardUser,
  type DayGroupKey,
  type ShownTask,
  type TaskSnapshot,
} from '../support/dashboard';
import { apiToken } from '../support/projects';
import { seedAccounts } from '../support/seed-data';

// Harvey's seeded fixtures are due today and in the coming days, relative to the seed date.
const [, harvey] = seedAccounts;
const groupLabels: Record<DayGroupKey, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  later: 'Later',
};
const emptyMessages: Record<DayGroupKey, string> = {
  today: 'Nothing due today.',
  tomorrow: 'Nothing due tomorrow.',
  later: 'Nothing else due this week.',
};

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

function allTasks(groups: Record<DayGroupKey, ShownTask[]>): ShownTask[] {
  return dayGroups.flatMap((key) => groups[key]);
}

/** Opens the dashboard and returns the task ids the API sent for Current & Upcoming. */
async function openAndCaptureIds(page: Page): Promise<number[]> {
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().includes('/api/dashboard/current-upcoming-tasks') &&
      candidate.request().method() === 'GET'
  );
  await openDashboard(page);
  const body = (await (await response).json()) as { tasks: { id: number }[] };
  return body.tasks.map((task) => task.id);
}

/** Checks each group's heading, count and tasks, and the section total, against the database. */
async function expectGroupsToMatch(
  page: Page,
  expected: Record<DayGroupKey, ShownTask[]>
): Promise<void> {
  const shown = limitGroups(expected, user.taskLimit);
  for (const key of dayGroups) {
    const group = dayGroup(page, key);
    await expect(group.getByRole('heading', { level: 3 })).toContainText(
      groupLabels[key]
    );
    await expect(
      group.locator('.count'),
      `${groupLabels[key]} count`
    ).toHaveText(String(shown[key].length));
    expect(await shownTasks(group), `${groupLabels[key]} tasks`).toEqual(
      shown[key]
    );
  }
  const total = allTasks(expected).length;
  await expect(currentUpcomingSection(page).locator('.summary')).toHaveText(
    `${total} ${total === 1 ? 'task' : 'tasks'}`
  );
}

test('E2E-CUR-01: Today, Tomorrow and Later match a service-role query and survive a reload', async ({
  page,
}) => {
  const expected = await expectedCurrentUpcoming(user);
  expect(
    allTasks(expected).length,
    'the dashboard seed should give Harvey open tasks due today or later this week'
  ).toBeGreaterThan(0);

  await logIn(page, harvey.email, harvey.password);
  const apiIds = await openAndCaptureIds(page);
  expect(apiIds, 'API tasks, in order').toEqual(
    allTasks(expected).map((task) => task.id)
  );
  await expectGroupsToMatch(page, expected);

  await page.reload();
  await expect(currentUpcomingSection(page).locator('.summary')).toBeVisible();
  await expectGroupsToMatch(page, await expectedCurrentUpcoming(user));
});

test('E2E-CUR-02: a task completed through the API is gone after a reload', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  await openDashboard(page);
  const before = limitGroups(
    await expectedCurrentUpcoming(user),
    user.taskLimit
  );
  const target = allTasks(before)[0];
  expect(
    target,
    'Harvey should have a current or upcoming task to complete'
  ).toBeDefined();
  expect(
    (await shownTasks(currentUpcomingSection(page))).map((task) => task.id)
  ).toContain(target.id);

  await completeTaskThroughApi(await apiToken(harvey), target.id);
  expect((await taskRow(target.id))?.['is_done']).toBe(true);

  await page.reload();
  await expect(currentUpcomingSection(page).locator('.summary')).toBeVisible();
  // A recurring task's next occurrence keeps the title, so check by id.
  expect(
    (await shownTasks(currentUpcomingSection(page))).map((task) => task.id)
  ).not.toContain(target.id);
  await expectGroupsToMatch(page, await expectedCurrentUpcoming(user));
});

test('E2E-CUR-03: a freshly created account shows the empty state', async ({
  page,
}) => {
  const account = await createFreshAccount();
  const expected = await expectedCurrentUpcoming(
    await dashboardUser(account.email)
  );
  expect(allTasks(expected)).toEqual([]);

  await logIn(page, account.email, account.password);
  await openDashboard(page);

  for (const key of dayGroups) {
    const group = dayGroup(page, key);
    await expect(group.locator('.count')).toHaveText('0');
    await expect(group.locator('li.task')).toHaveCount(0);
    await expect(
      group.getByText(emptyMessages[key], { exact: true })
    ).toBeVisible();
  }
  await expect(currentUpcomingSection(page).locator('.summary')).toHaveText(
    '0 tasks'
  );
  // Nobody else's tasks leak into a new account's dashboard.
  await expect(overdueSection(page).locator('li.task')).toHaveCount(0);
});

test('E2E-CUR-04: visiting /dashboard while signed out redirects to /login', async ({
  page,
}) => {
  const dashboardRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/dashboard/'))
      dashboardRequests.push(request.url());
  });

  await page.goto(`${baseUrl}/dashboard`);

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(
    page.getByRole('button', { name: 'Log in', exact: true })
  ).toBeVisible();
  expect(dashboardRequests).toEqual([]);
});
