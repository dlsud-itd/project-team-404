import {
  expect,
  test,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount, serviceRoleRows } from '../support/database';
import { userIdFor } from '../support/projects';
import { seedAccounts } from '../support/seed-data';
import { seededTaskAndLabelState } from '../support/tasks';

/**
 * Search end to end (Sprint 5: E2E-SRCH-01 to E2E-SRCH-04).
 *
 * Harvey searches the fixtures from supabase/seeds/010_search.sql and 009_archiving.sql: the
 * "Orbit launch checklist" task and "Orbit launch workspace" project, the "Search fixture -
 * Café run" task whose description alone says "accented", and the archived "ArchiveNeedle"
 * fixtures. James's "James Orbit task fixture" and "James ArchiveNeedle task fixture" must never
 * show up for Harvey. Searching changes nothing, so afterEach only checks that and restores the
 * seeded session rows.
 */

const [james, harvey] = seedAccounts;

let userId: string;
let state: Awaited<ReturnType<typeof seededTaskAndLabelState>>;

type TaskRow = { task_id: number; project_id: number; title: string };
type ProjectRow = { project_id: number; name: string };

async function harveyTask(title: string): Promise<TaskRow> {
  const rows = await serviceRoleRows<TaskRow>(
    'tbl_task',
    new URLSearchParams({
      select: 'task_id,project_id,title',
      user_id: `eq.${userId}`,
      title: `eq.${title}`,
      deleted_at: 'is.null',
    })
  );
  if (rows.length !== 1)
    throw new Error(`Seed task "${title}" is missing; seed the database`);
  return rows[0];
}

async function harveyProject(name: string): Promise<ProjectRow> {
  const rows = await serviceRoleRows<ProjectRow>(
    'tbl_project',
    new URLSearchParams({
      select: 'project_id,name',
      user_id: `eq.${userId}`,
      name: `eq.${name}`,
      deleted_at: 'is.null',
    })
  );
  if (rows.length !== 1)
    throw new Error(`Seed project "${name}" is missing; seed the database`);
  return rows[0];
}

function searchBox(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Search tasks and projects' });
}

function isSearch(q: string, includeArchived = false) {
  return (response: Response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/search' &&
      url.searchParams.get('q') === q &&
      url.searchParams.get('includeArchived') === String(includeArchived)
    );
  };
}

/** Focuses the box with Ctrl/Cmd+K, types `q` and waits for its answer. */
async function search(page: Page, q: string): Promise<void> {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('ControlOrMeta+K');
  await expect(searchBox(page)).toBeFocused();
  const answered = page.waitForResponse(isSearch(q));
  await searchBox(page).fill(q);
  expect((await answered).status()).toBe(200);
}

function results(page: Page): Locator {
  return page.getByRole('listbox', { name: 'Search results' });
}

function optionTitles(page: Page): Promise<string[]> {
  return results(page)
    .getByRole('option')
    .locator('.title')
    .allInnerTexts()
    .then((titles) => titles.map((title) => title.trim()));
}

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
  state = await seededTaskAndLabelState(userId);
});

test.afterEach(async () => {
  try {
    expect(await seededTaskAndLabelState(userId)).toEqual(state);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

test('finds tasks and projects by title, description and name, and opens them from the keyboard', async ({
  page,
}) => {
  const checklist = await harveyTask('Orbit launch checklist');
  const workspace = await harveyProject('Orbit launch workspace');
  await logIn(page, harvey.email, harvey.password);

  // Part of a title and a project name, grouped into Tasks and Projects.
  await search(page, 'launch');
  await expect(results(page)).toBeVisible();
  await expect(results(page).locator('.group-heading')).toHaveText([
    /^\s*Tasks\s+\d+\s*$/,
    /^\s*Projects\s+\d+\s*$/,
  ]);
  const titles = await optionTitles(page);
  expect(titles).toContain('Orbit launch checklist');
  expect(titles).toContain('Orbit launch workspace');
  await expect(results(page).locator('mark').first()).toHaveText(/launch/i);

  // Arrow keys move through the options; Enter opens the task in its project's editor.
  const options = results(page).getByRole('option');
  const taskIndex = titles.indexOf('Orbit launch checklist');
  for (let step = 0; step <= taskIndex; step++)
    await page.keyboard.press('ArrowDown');
  await expect(options.nth(taskIndex)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(
    new RegExp(
      `/projects/${checklist.project_id}/tasks/${checklist.task_id}/edit$`
    )
  );
  await expect(page.locator('#task-title')).toHaveValue(
    'Orbit launch checklist'
  );

  // The same with a project, which opens its task list.
  await search(page, 'launch');
  const projectIndex = (await optionTitles(page)).indexOf(
    'Orbit launch workspace'
  );
  for (let step = 0; step <= projectIndex; step++)
    await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(
    new RegExp(`/projects/${workspace.project_id}/tasks$`)
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Orbit launch workspace' })
  ).toBeVisible();

  // A word that is only in a task's description.
  await search(page, 'accented');
  await expect(results(page).getByRole('option')).toHaveCount(1);
  const cafe = results(page).getByRole('option').first();
  await expect(cafe.locator('.title')).toHaveText('Search fixture - Café run');
  await expect(cafe.locator('.tag')).toHaveText('in description');
  await expect(cafe.locator('.snippet mark')).toHaveText(/accented/i);

  // Escape closes the results and stays on the page.
  const url = page.url();
  await page.keyboard.press('Escape');
  await expect(results(page)).toHaveCount(0);
  expect(page.url()).toBe(url);
});

test('finds archived items only with Include archived, shows the empty state, and never shows another user', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);

  // Harvey's ArchiveNeedle fixtures are all archived, so a default search finds nothing.
  await search(page, 'ArchiveNeedle');
  const panel = page.locator('app-search-box .panel');
  await expect(panel.locator('.state')).toHaveText(
    /No tasks or projects match “ArchiveNeedle”\.\s*Archived items are hidden\./
  );

  const withArchived = page.waitForResponse(isSearch('ArchiveNeedle', true));
  await panel.locator('.archived-toggle').click();
  expect((await withArchived).status()).toBe(200);
  const archivedTitles = await optionTitles(page);
  expect(archivedTitles).toContain('ArchiveNeedle archived task fixture');
  expect(archivedTitles).toContain('ArchiveNeedle archived project');
  await expect(results(page).locator('.tag.archived').first()).toHaveText(
    'Archived'
  );
  // James has an ArchiveNeedle task too; Harvey never sees it.
  expect(archivedTitles).not.toContain('James ArchiveNeedle task fixture');

  // The same for an active term both users have.
  await page.locator('app-search-box .archived-toggle').click();
  await search(page, 'Orbit');
  const orbit = await optionTitles(page);
  // Ranking inside each group, as the API specification states: exact, then prefix, then
  // contains (a description-only match counts as contains); ties go to the most recently updated.
  const group = (key: 'tasks' | 'projects') =>
    results(page)
      .locator(`[aria-labelledby="global-search-${key}-heading"] .title`)
      .allInnerTexts()
      .then((titles) => titles.map((title) => title.trim()));
  const expectRanked = (
    shown: string[],
    exact: string,
    prefix: string,
    contains: string[]
  ) => {
    const known = shown.filter((title) =>
      [exact, prefix, ...contains].includes(title)
    );
    expect(known.slice(0, 2)).toEqual([exact, prefix]);
    expect(known.slice(2).sort()).toEqual([...contains].sort());
  };
  expectRanked(await group('tasks'), 'Orbit', 'Orbit launch checklist', [
    'Planning around Orbit',
  ]);
  expectRanked(await group('projects'), 'Orbit', 'Orbit launch workspace', [
    'Planning around Orbit',
    'Weekly Notes',
  ]);
  const weekly = results(page)
    .getByRole('option')
    .filter({ hasText: 'Weekly Notes' });
  await expect(weekly.locator('.tag')).toHaveText('in description');
  expect(orbit.length).toBeGreaterThan(0);
  expect(orbit).not.toContain('James Orbit task fixture');
  // Everything shown is Harvey's own, by service-role check.
  const jamesId = await userIdFor(james);
  const jamesTitles = (
    await serviceRoleRows<{ title: string }>(
      'tbl_task',
      new URLSearchParams({ select: 'title', user_id: `eq.${jamesId}` })
    )
  ).map((row) => row.title);
  for (const title of orbit) expect(jamesTitles).not.toContain(title);

  // A term with no match.
  await search(page, 'zzqxvnomatch');
  await expect(page.locator('app-search-box .panel .state')).toHaveText(
    /No tasks or projects match “zzqxvnomatch”/
  );
  await expect(results(page).getByRole('option')).toHaveCount(0);
});
