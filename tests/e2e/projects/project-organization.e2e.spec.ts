import { expect, test, type Locator, type Page } from '@playwright/test';
import { logIn } from '../support/auth';
import { projectRow, restoreSeedAccount } from '../support/database';
import {
  CreatedProjects,
  apiToken,
  createProjectThroughApi,
  e2eProjectPrefix,
  openOrganizer,
  openProjectList,
  projectApi,
  removeLeftovers,
  restoreSeededProjects,
  runId,
  seededProjects,
  userIdFor,
  type ApiProject,
  type SeedProjectState,
} from '../support/projects';
import { seedAccounts } from '../support/seed-data';

const harvey = seedAccounts[1];
const created = new CreatedProjects();
let harveyUserId: string;
let seedSnapshot: SeedProjectState[];
let alpha: ApiProject;
let beta: ApiProject;

test.beforeAll(async () => {
  await removeLeftovers(harvey);
  harveyUserId = await userIdFor(harvey);
  seedSnapshot = await seededProjects(harveyUserId);
});

test.beforeEach(async () => {
  const token = await apiToken(harvey);
  const run = runId();
  alpha = await createProjectThroughApi(token, {
    name: `${e2eProjectPrefix}Alpha ${run}`,
    color: '#16A34A',
  });
  created.add(alpha.id);
  beta = await createProjectThroughApi(token, {
    name: `${e2eProjectPrefix}Beta ${run}`,
    color: '#2563EB',
  });
  created.add(beta.id);
});

test.afterEach(async () => {
  try {
    await created.removeAll();
    await restoreSeededProjects(await apiToken(harvey), seedSnapshot);
    expect(await seededProjects(harveyUserId)).toEqual(seedSnapshot);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

const region = (scope: Locator, name: string) =>
  scope.getByRole('region', { name, exact: true });

/** Names in a switcher group, top to bottom. */
const namesIn = (group: Locator) => group.locator('.select .name');

function organizationResponse(page: Page, path: RegExp) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      path.test(new URL(response.url()).pathname)
  );
}

async function expectOk(response: Promise<{ status(): number }>) {
  expect((await response).status()).toBe(200);
}

test('favorites, archives and restores a project, keeping each change after a reload', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  let switcher = await openOrganizer(page);

  // Favorite
  const favorite = switcher.getByRole('button', {
    name: `Favorite ${alpha.name}`,
    exact: true,
  });
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  let saved = organizationResponse(
    page,
    new RegExp(`/api/projects/${alpha.id}/favorite$`)
  );
  await favorite.click();
  await expectOk(saved);
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await expect(namesIn(region(switcher, 'Favorites'))).toContainText([
    alpha.name,
  ]);
  await expect(namesIn(region(switcher, 'My projects'))).not.toContainText([
    alpha.name,
  ]);
  expect((await projectRow(alpha.id))?.is_favorite).toBe(true);

  await page.reload();
  await expect(namesIn(region(switcher, 'Favorites'))).toContainText([
    'Client Projects',
    alpha.name,
  ]);

  // The All projects view shows it under Favorites as well.
  const list = await openProjectList(page);
  await expect(
    region(list, 'Favorites').getByRole('link', {
      name: alpha.name,
      exact: true,
    })
  ).toBeVisible();

  // Archive
  switcher = await openOrganizer(page);
  saved = organizationResponse(
    page,
    new RegExp(`/api/projects/${alpha.id}/archive$`)
  );
  await switcher
    .getByRole('button', { name: `Archive ${alpha.name}`, exact: true })
    .click();
  await expectOk(saved);
  await expect(namesIn(region(switcher, 'Favorites'))).not.toContainText([
    alpha.name,
  ]);
  const archived = switcher.locator('details.archived');
  await archived.locator('summary').click();
  await expect(
    archived.getByRole('button', { name: `Restore ${alpha.name}` })
  ).toBeVisible();
  expect((await projectRow(alpha.id))?.is_archived).toBe(true);
  const token = await apiToken(harvey);
  const archivedList = await projectApi<ApiProject[]>(
    token,
    'GET',
    '?isArchived=true'
  );
  expect(archivedList.body.map((p) => p.id)).toContain(alpha.id);

  await page.reload();
  await expect(archived.locator('summary .count')).toHaveText('1');
  await archived.locator('summary').click();
  await expect(archived.getByText(alpha.name, { exact: true })).toBeVisible();
  await expect(
    (await openProjectList(page)).getByRole('link', {
      name: alpha.name,
      exact: true,
    })
  ).toHaveCount(0);

  // Restore
  switcher = await openOrganizer(page);
  await switcher.locator('details.archived summary').click();
  saved = organizationResponse(
    page,
    new RegExp(`/api/projects/${alpha.id}/archive$`)
  );
  await switcher
    .getByRole('button', { name: `Restore ${alpha.name}`, exact: true })
    .click();
  await expectOk(saved);
  await expect(namesIn(region(switcher, 'Favorites'))).toContainText([
    alpha.name,
  ]);
  expect(await projectRow(alpha.id)).toMatchObject({
    is_archived: false,
    is_favorite: true,
  });

  await page.reload();
  await expect(namesIn(region(switcher, 'Favorites'))).toContainText([
    alpha.name,
  ]);
  await expect(switcher.locator('details.archived')).toHaveCount(0);
});

test('keeps the Inbox free of archive, favorite and move controls', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  const switcher = await openOrganizer(page);
  const inbox = switcher.locator('.item.inbox');

  await expect(
    inbox.getByRole('button', { name: 'Inbox', exact: true })
  ).toBeVisible();
  await expect(inbox.getByRole('button')).toHaveCount(1);
  await expect(
    switcher.getByRole('button', { name: 'Archive Inbox' })
  ).toHaveCount(0);
  await expect(
    switcher.getByRole('button', { name: 'Favorite Inbox' })
  ).toHaveCount(0);
});

test('reorders projects by drag and drop and by keyboard, keeping the order after a reload', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  const switcher = await openOrganizer(page);
  const myProjects = region(switcher, 'My projects');
  await expect(namesIn(myProjects)).toHaveText([alpha.name, beta.name]);

  // Drag Beta above Alpha by its handle.
  const handle = myProjects
    .locator('li.item', { hasText: beta.name })
    .locator('.handle');
  const target = myProjects.locator('li.item', { hasText: alpha.name });
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  let saved = organizationResponse(page, /\/api\/projects\/reorder$/);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 8, {
    steps: 4,
  });
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 20 });
  await page.mouse.up();
  await expectOk(saved);
  await expect(namesIn(myProjects)).toHaveText([beta.name, alpha.name]);

  const sortOrders = async () => {
    const [a, b] = await Promise.all([
      projectRow(alpha.id),
      projectRow(beta.id),
    ]);
    return { alpha: a?.sort_order, beta: b?.sort_order };
  };
  // Favorites come first in the saved order, so Client Projects keeps 0.
  await expect.poll(sortOrders).toEqual({ beta: 1, alpha: 2 });

  await page.reload();
  await expect(namesIn(myProjects)).toHaveText([beta.name, alpha.name]);

  // Move Beta back down with the keyboard.
  const moveDown = myProjects.getByRole('button', {
    name: `Move ${beta.name} down`,
    exact: true,
  });
  await moveDown.focus();
  saved = organizationResponse(page, /\/api\/projects\/reorder$/);
  await page.keyboard.press('Enter');
  await expectOk(saved);
  await expect(namesIn(myProjects)).toHaveText([alpha.name, beta.name]);
  await expect.poll(sortOrders).toEqual({ alpha: 1, beta: 2 });

  await page.reload();
  await expect(namesIn(myProjects)).toHaveText([alpha.name, beta.name]);
});

test('switches between projects', async ({ page }) => {
  await logIn(page, harvey.email, harvey.password);
  const switcher = await openOrganizer(page);
  const select = (name: string) =>
    switcher
      .locator('.select')
      .filter({ has: page.getByText(name, { exact: true }) });

  await select(alpha.name).click();
  await expect(select(alpha.name)).toHaveAttribute('aria-current', 'true');
  await expect(switcher.locator('[aria-current="true"]')).toHaveCount(1);

  await select('Client Projects').click();
  await expect(select('Client Projects')).toHaveAttribute(
    'aria-current',
    'true'
  );
  await expect(select(alpha.name)).not.toHaveAttribute('aria-current', 'true');

  await select('Inbox').click();
  await expect(select('Inbox')).toHaveAttribute('aria-current', 'true');
  await expect(switcher.locator('[aria-current="true"]')).toHaveCount(1);
});

test('rolls the UI back when the backend request fails', async ({ page }) => {
  await logIn(page, harvey.email, harvey.password);
  const switcher = await openOrganizer(page);
  const myProjects = region(switcher, 'My projects');

  // Favorite: the next favorite call is blocked once.
  await page.route(
    '**/api/projects/*/favorite',
    (route) => route.abort('failed'),
    {
      times: 1,
    }
  );
  const favorite = switcher.getByRole('button', {
    name: `Favorite ${alpha.name}`,
    exact: true,
  });
  await favorite.click();
  await expect(switcher.getByRole('alert')).toContainText(
    "Your change wasn't saved."
  );
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  await expect(namesIn(myProjects)).toHaveText([alpha.name, beta.name]);
  expect((await projectRow(alpha.id))?.is_favorite).toBe(false);

  // Reorder: the next reorder call is blocked once.
  await page.route(
    '**/api/projects/reorder',
    (route) => route.abort('failed'),
    { times: 1 }
  );
  await myProjects
    .getByRole('button', { name: `Move ${alpha.name} down`, exact: true })
    .click();
  await expect(switcher.getByRole('alert')).toContainText(
    "Your change wasn't saved."
  );
  await expect(namesIn(myProjects)).toHaveText([alpha.name, beta.name]);
  expect((await projectRow(alpha.id))?.sort_order).toBe(0);
  expect((await projectRow(beta.id))?.sort_order).toBe(0);

  // With the route clear again, the same change goes through.
  const saved = organizationResponse(
    page,
    new RegExp(`/api/projects/${alpha.id}/favorite$`)
  );
  await favorite.click();
  await expectOk(saved);
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(namesIn(region(switcher, 'Favorites'))).toContainText([
    alpha.name,
  ]);
  await expect(namesIn(myProjects)).toHaveText([beta.name]);
});
