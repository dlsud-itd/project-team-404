import { expect, test, type Page, type Response } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount, serviceRoleRows } from '../support/database';
import {
  removeLeftovers,
  seededProjects,
  userIdFor,
  type SeedProjectState,
} from '../support/projects';
import { seedAccounts } from '../support/seed-data';
import {
  removeLeftoverTaskData,
  seededTaskAndLabelState,
} from '../support/tasks';

/**
 * Sorting & Filtering end to end (Sprint 5: E2E-SF-01, E2E-SF-02, E2E-SF-04).
 *
 * Harvey's "Filtering - Client Work" project and its Filtering, Review and Personal labels come
 * from supabase/seeds/006_filtering.sql. The tasks the page shows are checked against a
 * service-role query, so the test does not depend on the day the seed ran. Filtering and sorting
 * change only the URL, so nothing needs restoring beyond the seeded session rows; afterEach
 * still checks that the seeded tasks, labels and projects are unchanged.
 */

const [, harvey] = seedAccounts;
const PROJECT = 'Filtering - Client Work';

let userId: string;
let projectId: number;
let taskState: Awaited<ReturnType<typeof seededTaskAndLabelState>>;
let projectState: SeedProjectState[];

type TaskRow = {
  task_id: number;
  title: string;
  deadline: string | null;
  is_done: boolean;
  priority: { name: string } | null;
  labels: { label: { name: string } | null }[];
};

/** Every active task of the project with its priority and label names, by service role. */
async function projectTasks(): Promise<TaskRow[]> {
  return serviceRoleRows<TaskRow>(
    'tbl_task',
    new URLSearchParams({
      select:
        'task_id,title,deadline,is_done,priority:tbl_priority_level(name),labels:tbl_task_label(label:tbl_label(name))',
      user_id: `eq.${userId}`,
      project_id: `eq.${projectId}`,
      deleted_at: 'is.null',
      archived_at: 'is.null',
      order: 'task_id.asc',
    })
  );
}

/** The list shows open tasks under "To do", then completed ones, each in the server's order. */
function asShown(rows: TaskRow[]): string[] {
  return [
    ...rows.filter((row) => !row.is_done),
    ...rows.filter((row) => row.is_done),
  ].map((row) => row.title);
}

/** As GET /api/tasks orders by deadline descending: null deadlines last, then task id. */
function byDeadlineDesc(left: TaskRow, right: TaskRow): number {
  if (left.deadline === right.deadline) return left.task_id - right.task_id;
  if (left.deadline === null) return 1;
  if (right.deadline === null) return -1;
  return Date.parse(right.deadline) - Date.parse(left.deadline);
}

function isTaskList(response: Response): boolean {
  const url = new URL(response.url());
  return (
    response.request().method() === 'GET' &&
    url.pathname === '/api/tasks' &&
    url.searchParams.get('projectId') === String(projectId)
  );
}

function taskTitles(page: Page) {
  return page.locator('app-task-list app-task-item .title');
}

function chip(page: Page, name: string) {
  return page
    .locator('app-task-filter-bar .chip')
    .filter({ hasText: new RegExp(`^\\s*${name}`) });
}

async function check(
  page: Page,
  chipName: string,
  panelId: string,
  option: string
) {
  const panel = page.locator(`#${panelId}`);
  if (!(await panel.isVisible())) await chip(page, chipName).click();
  await panel.getByRole('checkbox', { name: option, exact: true }).check();
}

/** Picks a field in the sort menu, a CDK overlay outside the page. */
async function sortBy(page: Page, host: string, option: string) {
  await page.locator(`${host} app-sort-menu .trigger`).click();
  await page.getByRole('menuitemradio', { name: option, exact: true }).click();
}

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
  await removeLeftovers(harvey);
  await removeLeftoverTaskData(userId);
  const projects = await serviceRoleRows<{ project_id: number }>(
    'tbl_project',
    new URLSearchParams({
      select: 'project_id',
      user_id: `eq.${userId}`,
      name: `eq.${PROJECT}`,
      deleted_at: 'is.null',
    })
  );
  if (projects.length !== 1) {
    throw new Error(
      `Seed project "${PROJECT}" is missing; run npm run supabase:local:seed`
    );
  }
  projectId = projects[0].project_id;
  taskState = await seededTaskAndLabelState(userId);
  projectState = await seededProjects(userId);
});

test.afterEach(async () => {
  try {
    expect(await seededTaskAndLabelState(userId)).toEqual(taskState);
    expect(await seededProjects(userId)).toEqual(projectState);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

test('filters tasks by two priorities and a label, sorts by deadline and keeps both on reload', async ({
  page,
}) => {
  const all = await projectTasks();
  const matching = all.filter(
    (row) =>
      ['high', 'low'].includes(row.priority?.name.toLowerCase() ?? '') &&
      row.labels.some((link) => link.label?.name === 'Review')
  );
  // The seed gives this project open and completed High/Low tasks labelled Review.
  expect(matching.length).toBeGreaterThan(1);
  expect(matching.length).toBeLessThan(all.length);

  await logIn(page, harvey.email, harvey.password);
  const opened = page.waitForResponse(isTaskList);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await opened;
  await expect(
    page.getByRole('heading', { level: 1, name: PROJECT })
  ).toBeVisible();
  await expect(taskTitles(page)).toHaveCount(all.length);

  // Quick changes are debounced into one request carrying both filters.
  const filtered = page.waitForResponse(
    (response) =>
      isTaskList(response) &&
      new URL(response.url()).searchParams.get('priorities') === 'high,low' &&
      new URL(response.url()).searchParams.has('labelId')
  );
  await check(page, 'Priority', 'task-filter-priority', 'High');
  await check(page, 'Priority', 'task-filter-priority', 'Low');
  await check(page, 'Labels', 'task-filter-labels', 'Review');
  expect((await filtered).status()).toBe(200);

  await expect(page).toHaveURL(/[?&]priorities=high,low/);
  await expect(page).toHaveURL(/[?&]labelIds=\d+/);
  await expect(taskTitles(page)).toHaveText(asShown(matching));

  const sorted = page.waitForResponse(
    (response) =>
      isTaskList(response) &&
      new URL(response.url()).searchParams.get('orderBy') === 'deadline' &&
      new URL(response.url()).searchParams.get('orderDirection') === 'desc'
  );
  await sortBy(page, 'app-task-list', 'Deadline');
  await page.locator('app-task-list app-sort-menu .direction').click();
  expect((await sorted).status()).toBe(200);
  const expectedOrder = asShown([...matching].sort(byDeadlineDesc));
  await expect(taskTitles(page)).toHaveText(expectedOrder);
  await expect(page).toHaveURL(/[?&]orderBy=deadline/);
  await expect(page).toHaveURL(/[?&]orderDirection=desc/);

  // A reload restores the chips and the sort menu from the URL and asks for the same list.
  const url = page.url();
  const reloaded = page.waitForResponse(isTaskList);
  await page.reload();
  const again = new URL((await reloaded).url()).searchParams;
  expect(again.get('priorities')).toBe('high,low');
  expect(again.get('orderBy')).toBe('deadline');
  expect(again.get('orderDirection')).toBe('desc');
  expect(page.url()).toBe(url);
  await expect(chip(page, 'Priority')).toHaveText(/Priority: Low, High/);
  await expect(chip(page, 'Labels')).toHaveText(/Labels: Review/);
  await expect(page.locator('app-task-filter-bar .count')).toHaveText(
    '2 filters'
  );
  await expect(page.locator('app-task-list app-sort-menu .trigger')).toHaveText(
    /Sort:\s*Deadline/
  );
  await expect(
    page.locator('app-task-list app-sort-menu .direction')
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(taskTitles(page)).toHaveText(expectedOrder);

  // Clear all removes the filters (the sort is not a filter) and every task is back.
  const cleared = page.waitForResponse(
    (response) =>
      isTaskList(response) &&
      !new URL(response.url()).searchParams.has('labelId')
  );
  await page.locator('app-task-filter-bar button.clear').click();
  await cleared;
  await expect(page).not.toHaveURL(/priorities=|labelIds=/);
  await expect(page.locator('app-task-filter-bar .count')).toHaveCount(0);
  await expect(taskTitles(page)).toHaveText(
    asShown([...all].sort(byDeadlineDesc))
  );
});

test('filters /projects to favorites and sorts them by name, keeping both on reload', async ({
  page,
}) => {
  const favorites = (
    await serviceRoleRows<{ name: string }>(
      'tbl_project',
      new URLSearchParams({
        select: 'name',
        user_id: `eq.${userId}`,
        is_favorite: 'eq.true',
        is_archived: 'eq.false',
        is_inbox: 'eq.false',
        deleted_at: 'is.null',
      })
    )
  )
    .map((row) => row.name)
    .sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' })
    );
  expect(favorites.length).toBeGreaterThan(1);

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects`);
  await expect(page).toHaveURL(/\/home\?tab=projects$/);
  const list = page.locator('app-projects-page');
  await expect(list.locator('app-project-card.inbox')).toBeVisible();

  await list
    .locator('app-project-filter-bar .chip', { hasText: 'Favorites' })
    .click();
  await sortBy(page, 'app-projects-page', 'Name');
  await expect(page).toHaveURL(/[?&]favorites=true/);
  await expect(page).toHaveURL(/[?&]sort=name/);
  const names = list.locator('app-project-card .tasks-link');
  await expect(names).toHaveText(favorites);

  await page.reload();
  await expect(
    list.locator('app-project-filter-bar .chip', { hasText: 'Favorites' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(list.locator('app-sort-menu .trigger')).toHaveText(
    /Sort:\s*Name/
  );
  await expect(names).toHaveText(favorites);
});
