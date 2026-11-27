import { expect, test, type Locator, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount } from '../support/database';
import {
  activeTasks,
  addDays,
  apiResponse,
  expectSeededToday,
  expectUnchanged,
  harvey,
  SeedSnapshot,
  seededProjectId,
  seedUser,
  textsOf,
  todayFor,
  type SeedUser,
  type TaskRow,
} from '../support/sprint6';

/**
 * List & Table Views end to end (Sprint 6: E2E-LTV-01, E2E-LTV-02).
 *
 * Harvey's "Timeline - Work" project comes from supabase/seeds/013_timeline.sql: an open
 * "Multi-day" task (tomorrow to four days on), an open "Single-day" task (in two days) and a
 * "Completed" one (today). The Active status filter leaves the two open tasks, which every view
 * should show: List, Table, Board, and the Timeline window that holds them. The tasks are dated
 * relative to the day the seed ran, so the spec stops unless it ran today. Views and filters
 * live in the URL and the browser, so nothing in the database changes; afterEach checks that.
 */

const PROJECT = 'Timeline - Work';
const MULTI_DAY = 'Timeline fixture - Multi-day';

let user: SeedUser;
let projectId: number;
let snapshot: SeedSnapshot;

const sorted = (titles: string[]) => [...titles].sort();

async function openTasks(): Promise<TaskRow[]> {
  return (await activeTasks(user, projectId)).filter((row) => !row.is_done);
}

function viewLink(page: Page, name: string): Locator {
  return page
    .locator('app-task-list app-view-switcher')
    .getByRole('link', { name, exact: true });
}

async function switchTo(page: Page, name: string): Promise<void> {
  await viewLink(page, name).click();
  await expect(viewLink(page, name)).toHaveAttribute('aria-current', 'page');
}

const listTitles = (page: Page) =>
  page.locator('app-list-view app-task-item .title');
const tableTitles = (page: Page) =>
  page.locator('app-table-view tbody tr a.title');
const boardTitles = (page: Page) =>
  page.locator('app-board-view app-board-card h3.title');
const shownBars = (page: Page) =>
  page.locator('app-timeline-view app-timeline-bar:visible button.title');

/** The Monday that starts the week holding `date`, as the timeline's week does. */
function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

test.beforeAll(async () => {
  user = await seedUser(harvey);
  projectId = await seededProjectId(user, PROJECT, '013_timeline.sql');
  const multiDay = (await activeTasks(user, projectId)).find(
    (row) => row.title === MULTI_DAY
  );
  // Multi-day is scheduled for the day after the seed ran.
  expectSeededToday(
    MULTI_DAY,
    multiDay?.scheduled_date ? addDays(multiDay.scheduled_date, -1) : null,
    user
  );
  snapshot = await SeedSnapshot.take(harvey, user, [projectId]);
});

test.afterEach(async () => {
  try {
    await snapshot.restore();
    await expectUnchanged(snapshot);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

test('shows the same filtered tasks in List, Table, Board and Timeline', async ({
  page,
}) => {
  const expected = sorted((await openTasks()).map((row) => row.title));
  expect(expected).toHaveLength(2);
  const all = (await activeTasks(user, projectId)).map((row) => row.title);
  expect(all.length, 'the project also has a completed task').toBeGreaterThan(
    expected.length
  );

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await expect(viewLink(page, 'List')).toHaveAttribute('aria-current', 'page');
  await expect(listTitles(page)).toHaveCount(all.length);

  // Status: Active in the filter bar.
  const filtered = apiResponse(page, 'GET', /\/api\/tasks$/);
  await page.locator('[aria-controls="task-filter-status"]').click();
  await page
    .locator('#task-filter-status')
    .getByRole('radio', { name: 'Active', exact: true })
    .check();
  expect((await filtered).url()).toContain('status=active');
  await expect(page).toHaveURL(/[?&]status=active/);
  await expect(listTitles(page)).toHaveCount(expected.length);
  expect(sorted(await textsOf(listTitles(page)))).toEqual(expected);

  await switchTo(page, 'Table');
  await expect(page).toHaveURL(/[?&]status=active/);
  await expect(tableTitles(page)).toHaveCount(expected.length);
  expect(sorted(await textsOf(tableTitles(page)))).toEqual(expected);

  await switchTo(page, 'Board');
  await expect(boardTitles(page)).toHaveCount(expected.length);
  expect(sorted(await textsOf(boardTitles(page)))).toEqual(expected);

  await switchTo(page, 'Timeline');
  // Both tasks cross the day after tomorrow; open the week that holds it.
  const target = addDays(todayFor(user), 2);
  if (mondayOf(target) !== mondayOf(todayFor(user))) {
    await page.getByRole('button', { name: 'Next week', exact: true }).click();
  }
  await expect(shownBars(page)).toHaveCount(expected.length);
  expect(sorted(await textsOf(shownBars(page)))).toEqual(expected);

  // The filter stayed applied the whole way.
  await expect(page).toHaveURL(/[?&]status=active/);
});

test('sorts the table by a column header', async ({ page }) => {
  const titles = (await activeTasks(user, projectId)).map((row) => row.title);
  const ascending = [...titles].sort();

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks?view=table`);
  await expect(tableTitles(page)).toHaveCount(titles.length);

  const header = page.locator('app-table-view th.col-title');
  let sortedResponse = apiResponse(page, 'GET', /\/api\/tasks$/);
  await header.getByRole('button').click();
  expect((await sortedResponse).url()).toMatch(
    /orderBy=title&orderDirection=asc/
  );
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await expect(tableTitles(page)).toHaveText(ascending);
  await expect(page).toHaveURL(/[?&]orderBy=title/);

  sortedResponse = apiResponse(page, 'GET', /\/api\/tasks$/);
  await header.getByRole('button').click();
  expect((await sortedResponse).url()).toMatch(
    /orderBy=title&orderDirection=desc/
  );
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  await expect(tableTitles(page)).toHaveText([...ascending].reverse());

  // The sort is kept after a reload.
  await page.reload();
  await expect(page.locator('app-table-view th.col-title')).toHaveAttribute(
    'aria-sort',
    'descending'
  );
  await expect(tableTitles(page)).toHaveText([...ascending].reverse());
});

test('restores the chosen view after a reload and when the URL names none', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await expect(viewLink(page, 'List')).toHaveAttribute('aria-current', 'page');

  await switchTo(page, 'Table');
  await expect(page).toHaveURL(/[?&]view=table/);
  await page.reload();
  await expect(viewLink(page, 'Table')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('app-table-view')).toBeVisible();

  // Without ?view=, the project opens on the view last used there.
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await expect(viewLink(page, 'Table')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('app-table-view')).toBeVisible();

  await switchTo(page, 'Timeline');
  await page.reload();
  await expect(viewLink(page, 'Timeline')).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.locator('app-timeline-view')).toBeVisible();
});
