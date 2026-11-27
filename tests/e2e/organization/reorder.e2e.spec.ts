import { expect, test, type Locator, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount } from '../support/database';
import { openOrganizer } from '../support/projects';
import {
  activeTasks,
  apiResponse,
  dragTo,
  expectUnchanged,
  james,
  SeedSnapshot,
  seededProjectId,
  seedUser,
  textsOf,
  type SeedUser,
} from '../support/sprint6';

/**
 * Drag & Drop Reordering end to end (Sprint 6: E2E-DND-01, E2E-DND-03).
 *
 * James's "Reorder - Project One" (tasks "Reorder seed 01" to "06", positions 1 to 6) and
 * "Reorder - Project Two" come from supabase/seeds/011_task_positions.sql. The task list is in
 * Default order (the project's custom order), so its drag handles and Move buttons are on.
 * Orders are checked in the page, in the database and after a reload. afterEach puts every task
 * position and James's project order back. These fixtures are not dated, so the spec does not
 * depend on the day the seed ran.
 */

const ONE = 'Reorder - Project One';
const TWO = 'Reorder - Project Two';
const SEEDED = [1, 2, 3, 4, 5, 6].map((n) => `Reorder seed 0${n}`);

let user: SeedUser;
let oneId: number;
let twoId: number;
let snapshot: SeedSnapshot;

function openTitles(page: Page): Locator {
  return page.locator(
    'app-list-view [aria-labelledby="open-heading"] app-task-item .title'
  );
}

function openItem(page: Page, title: string): Locator {
  return page
    .locator('app-list-view [aria-labelledby="open-heading"] li.item')
    .filter({ hasText: title });
}

/** The project's open task titles in position order, from the database. */
async function savedOrder(projectId: number): Promise<string[]> {
  return (await activeTasks(user, projectId))
    .filter((row) => !row.is_done)
    .sort((a, b) => a.position - b.position || a.task_id - b.task_id)
    .map((row) => row.title);
}

async function openProject(page: Page, projectId: number): Promise<void> {
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await expect(
    page.locator('app-task-list app-sort-menu .trigger')
  ).toContainText('Default order');
}

test.beforeAll(async () => {
  user = await seedUser(james);
  oneId = await seededProjectId(user, ONE, '011_task_positions.sql');
  twoId = await seededProjectId(user, TWO, '011_task_positions.sql');
  if (
    JSON.stringify(
      (await savedOrder(oneId)).filter((t) => SEEDED.includes(t))
    ) !== JSON.stringify(SEEDED)
  ) {
    throw new Error(
      `"${ONE}" is not in its seeded order; run npm run supabase:local:seed (011_task_positions.sql)`
    );
  }
  snapshot = await SeedSnapshot.take(james, user, [oneId, twoId]);
});

test.afterEach(async () => {
  try {
    await snapshot.restore();
    await expectUnchanged(snapshot);
  } finally {
    await restoreSeedAccount(james.email);
  }
});

test('drags the third task to the top and keeps the order after a reload', async ({
  page,
}) => {
  await logIn(page, james.email, james.password);
  await openProject(page, oneId);
  const before = await textsOf(openTitles(page));
  expect(before.slice(0, 3)).toEqual(SEEDED.slice(0, 3));
  const expected = [before[2], before[0], before[1], ...before.slice(3)];

  const saved = apiResponse(page, 'PUT', /\/api\/tasks\/reorder$/);
  await dragTo(
    page,
    openItem(page, before[2]).locator('.handle'),
    openItem(page, before[0])
  );
  const response = await saved;
  expect(response.status()).toBe(200);
  // Every open task of the project is sent, in the new order.
  expect(response.request().postDataJSON()).toMatchObject({ projectId: oneId });

  await expect(openTitles(page)).toHaveText(expected);
  await expect.poll(() => savedOrder(oneId)).toEqual(expected);

  await page.reload();
  await expect(openTitles(page)).toHaveText(expected);

  // Project Two keeps its own order.
  await expect
    .poll(() => savedOrder(twoId))
    .toEqual(['Reorder second 01', 'Reorder second 02', 'Reorder second 03']);
});

test('moves tasks with the Move buttons and Alt+Arrow keys and keeps the order after a reload', async ({
  page,
}) => {
  await logIn(page, james.email, james.password);
  await openProject(page, oneId);
  const before = await textsOf(openTitles(page));

  // Move up on the fourth task, from the keyboard.
  const moveUp = page.getByRole('button', {
    name: `Move ${before[3]} up`,
    exact: true,
  });
  await moveUp.focus();
  let saved = apiResponse(page, 'PUT', /\/api\/tasks\/reorder$/);
  await page.keyboard.press('Enter');
  expect((await saved).status()).toBe(200);
  const afterUp = [
    before[0],
    before[1],
    before[3],
    before[2],
    ...before.slice(4),
  ];
  await expect(openTitles(page)).toHaveText(afterUp);
  // Focus stays on the moved task's button.
  await expect(moveUp).toBeFocused();

  // Alt+ArrowDown from the first task's row moves it down one place.
  await openItem(page, afterUp[0]).locator('a.edit').focus();
  saved = apiResponse(page, 'PUT', /\/api\/tasks\/reorder$/);
  await page.keyboard.press('Alt+ArrowDown');
  expect((await saved).status()).toBe(200);
  const afterDown = [afterUp[1], afterUp[0], ...afterUp.slice(2)];
  await expect(openTitles(page)).toHaveText(afterDown);
  await expect.poll(() => savedOrder(oneId)).toEqual(afterDown);

  await page.reload();
  await expect(openTitles(page)).toHaveText(afterDown);
});

test('drags a project in the project list and keeps the order after a reload', async ({
  page,
}) => {
  await logIn(page, james.email, james.password);
  const switcher = await openOrganizer(page);
  const myProjects = switcher.getByRole('region', {
    name: 'My projects',
    exact: true,
  });
  const names = myProjects.locator('.select .name');
  const before = await textsOf(names);
  const one = before.indexOf(ONE);
  const two = before.indexOf(TWO);
  expect(two, 'Project Two directly follows Project One in the seed').toBe(
    one + 1
  );
  const expected = [...before];
  expected.splice(one, 2, TWO, ONE);

  const saved = apiResponse(page, 'PUT', /\/api\/projects\/reorder$/);
  await dragTo(
    page,
    myProjects.locator('li.item', { hasText: TWO }).locator('.handle'),
    myProjects.locator('li.item', { hasText: ONE })
  );
  expect((await saved).status()).toBe(200);
  await expect(names).toHaveText(expected);

  await page.reload();
  await expect(names).toHaveText(expected);
});
