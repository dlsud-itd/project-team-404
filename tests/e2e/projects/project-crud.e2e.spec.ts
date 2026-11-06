import { expect, test } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  inboxProjectsForUser,
  projectRow,
  restoreSeedAccount,
} from '../support/database';
import {
  CreatedProjects,
  apiToken,
  createProjectThroughApi,
  e2eProjectPrefix,
  openProjectList,
  projectApi,
  projectCard,
  removeLeftovers,
  restoreSeededProjects,
  rgb,
  runId,
  seededProjects,
  userIdFor,
  type SeedProjectState,
} from '../support/projects';
import { seedAccounts } from '../support/seed-data';

const [james, harvey] = seedAccounts;
const created = new CreatedProjects();
let harveyUserId: string;
let seedSnapshot: SeedProjectState[];

test.beforeAll(async () => {
  await removeLeftovers(harvey, james);
  harveyUserId = await userIdFor(harvey);
  seedSnapshot = await seededProjects(harveyUserId);
  expect(seedSnapshot.map((p) => p.name)).toEqual(
    expect.arrayContaining(['Inbox', 'Client Projects'])
  );
});

test.afterEach(async () => {
  try {
    await created.removeAll();
    await restoreSeededProjects(await apiToken(harvey), seedSnapshot);
    expect(await seededProjects(harveyUserId)).toEqual(seedSnapshot);
  } finally {
    await restoreSeedAccount(harvey.email);
    await restoreSeedAccount(james.email);
  }
});

test('shows the Inbox first in the sidebar after login and opens it', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  const sidebar = page.locator('app-project-list');
  const sidebarNames = sidebar.locator('li.project .name');
  await expect(sidebarNames.first()).toHaveText('Inbox');
  await expect(sidebarNames).toContainText(['Inbox', 'Client Projects']);

  const [{ project_id: inboxId }] = await inboxProjectsForUser(harveyUserId);
  const list = await openProjectList(page);
  await list
    .locator('app-project-card.inbox')
    .getByRole('link', { name: 'Inbox', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${inboxId}/tasks$`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inbox' })
  ).toBeVisible();
});

test('lists the Inbox and seeded projects and keeps the Inbox read-only', async ({
  page,
}) => {
  await logIn(page, harvey.email, harvey.password);
  const list = await openProjectList(page);

  const inbox = list.locator('app-project-card.inbox');
  await expect(
    inbox.getByRole('link', { name: 'Inbox', exact: true })
  ).toBeVisible();
  await expect(inbox.getByText('Read-only', { exact: true })).toBeVisible();
  await expect(inbox.getByRole('link', { name: /^Edit / })).toHaveCount(0);
  await expect(inbox.getByRole('button', { name: /^Delete / })).toHaveCount(0);

  // The Inbox comes before every other project.
  await expect(list.locator('app-project-card').first()).toHaveClass(/inbox/);

  const clientProjects = projectCard(list, 'Client Projects');
  await expect(clientProjects).toContainText(
    'Client deliverables and meetings'
  );
  await expect(clientProjects.locator('.swatch')).toHaveCSS(
    'background-color',
    rgb('#3b82f6')
  );
  await expect(
    list.getByRole('region', { name: 'Favorites' }).getByRole('link', {
      name: 'Client Projects',
      exact: true,
    })
  ).toBeVisible();

  // Opening the Inbox's edit URL directly shows no form.
  const [{ project_id: inboxId }] = await inboxProjectsForUser(harveyUserId);
  await page.goto(`${baseUrl}/projects/${inboxId}/edit`);
  await expect(
    page.getByText(
      "Your Inbox is read-only, so it can't be renamed or changed."
    )
  ).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveCount(0);
});

test('creates, edits and deletes a project, with each step surviving a reload and saved in the database', async ({
  page,
}) => {
  const run = runId();
  const name = `${e2eProjectPrefix}Project ${run}`;
  const description = `Created by the E2E run ${run}`;
  const renamed = `${name} edited`;
  const newDescription = `Edited by the E2E run ${run}`;

  await logIn(page, harvey.email, harvey.password);
  let list = await openProjectList(page);

  // Create
  await list.getByRole('button', { name: '+ New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel(/^Description/).fill(description);
  await dialog.getByRole('radio', { name: 'Teal', exact: true }).check();
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/projects'
  );
  await dialog.getByRole('button', { name: 'Create project' }).click();
  const response = await createResponse;
  expect(response.status()).toBe(201);
  const projectId = ((await response.json()) as { id: number }).id;
  created.add(projectId);
  await expect(dialog).toBeHidden();

  await expect(projectCard(list, name)).toContainText(description);

  const createdRow = await projectRow(projectId);
  expect(createdRow).toMatchObject({
    user_id: harveyUserId,
    name,
    description,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    deleted_at: null,
  });
  expect(createdRow?.color?.toUpperCase()).toBe('#0D9488');

  await page.reload();
  list = page.locator('app-projects-page');
  await expect(projectCard(list, name)).toContainText(description);
  await expect(projectCard(list, name).locator('.swatch')).toHaveCSS(
    'background-color',
    rgb('#0D9488')
  );

  // Edit
  await projectCard(list, name)
    .getByRole('link', { name: `Edit ${name}`, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/edit$`));
  const nameField = page.getByLabel('Name', { exact: true });
  const descriptionField = page.getByLabel(/^Description/);
  await expect(nameField).toHaveValue(name);
  await expect(descriptionField).toHaveValue(description);
  await expect(
    page.getByRole('radio', { name: 'Teal', exact: true })
  ).toBeChecked();

  const save = page.getByRole('button', { name: 'Save changes' });
  await expect(save).toBeDisabled();
  await nameField.fill(renamed);
  await descriptionField.fill(newDescription);
  await page.getByRole('radio', { name: 'Violet', exact: true }).check();
  await save.click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Changes saved.' })
  ).toBeVisible();

  await expect
    .poll(async () => {
      const row = await projectRow(projectId);
      return [row?.name, row?.description, row?.color?.toUpperCase()];
    })
    .toEqual([renamed, newDescription, '#7C3AED']);

  await page.reload();
  await expect(nameField).toHaveValue(renamed);
  await expect(descriptionField).toHaveValue(newDescription);
  await expect(
    page.getByRole('radio', { name: 'Violet', exact: true })
  ).toBeChecked();

  list = await openProjectList(page);
  await expect(projectCard(list, renamed)).toContainText(newDescription);
  await expect(projectCard(list, renamed).locator('.swatch')).toHaveCSS(
    'background-color',
    rgb('#7C3AED')
  );
  await expect(projectCard(list, name)).toHaveCount(0);

  // Delete
  await projectCard(list, renamed)
    .getByRole('button', { name: `Delete ${renamed}`, exact: true })
    .click();
  const confirm = page.getByRole('alertdialog', {
    name: `Delete “${renamed}”?`,
  });
  await expect(confirm).toContainText('Its tasks will be moved to your Inbox.');
  await confirm.getByRole('button', { name: 'Delete project' }).click();
  await expect(confirm).toBeHidden();
  await expect(
    list.getByRole('status').filter({ hasText: `“${renamed}” was deleted.` })
  ).toBeVisible();
  await expect(projectCard(list, renamed)).toHaveCount(0);

  await expect
    .poll(async () => (await projectRow(projectId))?.deleted_at ?? null)
    .not.toBeNull();

  await page.reload();
  list = page.locator('app-projects-page');
  await expect(list.locator('app-project-card.inbox')).toBeVisible();
  await expect(projectCard(list, 'Client Projects')).toBeVisible();
  await expect(projectCard(list, renamed)).toHaveCount(0);
});

test("does not show another user's project", async ({ page }) => {
  const name = `${e2eProjectPrefix}James only ${runId()}`;
  const jamesProject = await createProjectThroughApi(await apiToken(james), {
    name,
    description: 'Owned by james',
    color: '#DC2626',
  });
  created.add(jamesProject.id);

  await logIn(page, harvey.email, harvey.password);
  const list = await openProjectList(page);
  await expect(projectCard(list, 'Client Projects')).toBeVisible();
  await expect(list.getByText(name)).toHaveCount(0);

  await page.goto(`${baseUrl}/projects/${jamesProject.id}/edit`);
  await expect(page.getByRole('alert')).toContainText('Project not found.');
  await expect(page.getByLabel('Name', { exact: true })).toHaveCount(0);

  const harveyToken = await apiToken(harvey);
  const { status } = await projectApi(
    harveyToken,
    'GET',
    `/${jamesProject.id}`
  );
  expect(status).toBe(404);
  expect(await projectRow(jamesProject.id)).toMatchObject({
    name,
    deleted_at: null,
  });
});
