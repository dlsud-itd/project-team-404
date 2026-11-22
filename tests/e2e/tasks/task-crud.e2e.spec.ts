import { expect, test, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  inboxProjectsForUser,
  restoreSeedAccount,
  taskRow,
} from '../support/database';
import { apiToken, userIdFor } from '../support/projects';
import { seedAccounts } from '../support/seed-data';
import {
  CreatedTaskData,
  e2eTaskPrefix,
  removeLeftoverTaskData,
  seededTaskAndLabelState,
  taskApi,
} from '../support/tasks';

const [james, harvey] = seedAccounts;
const created = new CreatedTaskData();
let harveyUserId: string;
let harveyInboxId: number;
let jamesInboxId: number;
let harveySeedState: Awaited<ReturnType<typeof seededTaskAndLabelState>>;
let jamesSeedState: Awaited<ReturnType<typeof seededTaskAndLabelState>>;

test.beforeAll(async () => {
  harveyUserId = await userIdFor(harvey);
  const jamesUserId = await userIdFor(james);
  await removeLeftoverTaskData(harveyUserId);
  harveyInboxId = (await inboxProjectsForUser(harveyUserId))[0].project_id;
  jamesInboxId = (await inboxProjectsForUser(jamesUserId))[0].project_id;
  harveySeedState = await seededTaskAndLabelState(harveyUserId);
  jamesSeedState = await seededTaskAndLabelState(jamesUserId);
});

test.afterEach(async () => {
  try {
    await created.removeAll(harveyUserId);
    await removeLeftoverTaskData(harveyUserId);
    expect(await seededTaskAndLabelState(harveyUserId)).toEqual(
      harveySeedState
    );
    expect(await seededTaskAndLabelState(await userIdFor(james))).toEqual(
      jamesSeedState
    );
  } finally {
    await restoreSeedAccount(harvey.email);
    await restoreSeedAccount(james.email);
  }
});

async function openTaskList(page: Page): Promise<void> {
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects/${harveyInboxId}/tasks`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inbox' })
  ).toBeVisible();
}

test('creates, edits, reloads and deletes a task without changing seeded data', async ({
  page,
}) => {
  const title = `${e2eTaskPrefix}CRUD ${Date.now().toString(36)}`;
  const description = 'Created and verified by the Task CRUD E2E test';
  await openTaskList(page);

  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog.getByLabel(/^Description/).fill(description);
  await dialog
    .getByLabel('Priority', { exact: true })
    .selectOption({ label: 'High' });
  const createPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/tasks'
  );
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const response = await createPromise;
  expect(response.status()).toBe(201);
  const { id, priority } = (await response.json()) as {
    id: number;
    priority: string;
  };
  expect(priority).toBe('high');
  created.addTask(id);

  const task = page.locator('app-task-item').filter({ hasText: title });
  await expect(task.locator('.title')).toHaveText(title);
  expect(await taskRow(id)).toMatchObject({
    user_id: harveyUserId,
    project_id: harveyInboxId,
    title,
    description,
    scheduled_date: null,
    due_date: null,
    deleted_at: null,
  });

  await page.reload();
  await expect(task.locator('.title')).toHaveText(title);
  await page.getByRole('link', { name: `Edit ${title}`, exact: true }).click();
  const renamed = `${title} edited`;
  await page.getByLabel('Title', { exact: true }).fill(renamed);
  const updatePromise = page.waitForResponse(
    (res) =>
      res.request().method() === 'PUT' &&
      new URL(res.url()).pathname === `/api/tasks/${id}`
  );
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await updatePromise).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('Changes saved.');

  await page.locator('a.back').click();
  const renamedTask = page
    .locator('app-task-item')
    .filter({ hasText: renamed });
  await expect(renamedTask.locator('.title')).toHaveText(renamed);
  await page.reload();
  await expect(renamedTask.locator('.title')).toHaveText(renamed);
  await expect(renamedTask.locator('.priority')).toHaveText('High');
  await page
    .getByRole('button', { name: `Delete ${renamed}`, exact: true })
    .click();
  const confirm = page.getByRole('alertdialog', {
    name: `Delete “${renamed}”?`,
  });
  await expect(confirm).toBeVisible();
  const deletePromise = page.waitForResponse(
    (res) =>
      res.request().method() === 'DELETE' &&
      new URL(res.url()).pathname === `/api/tasks/${id}`
  );
  await confirm
    .getByRole('button', { name: 'Delete task', exact: true })
    .click();
  expect((await deletePromise).status()).toBe(200);
  await expect(
    page.locator('app-task-item .title', { hasText: renamed })
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator('app-task-item .title', { hasText: renamed })
  ).toHaveCount(0);
  expect((await taskRow(id))?.['deleted_at']).not.toBeNull();
});

test('rejects an empty title without creating a task', async ({ page }) => {
  await openTaskList(page);
  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  let postAttempted = false;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/tasks'
    ) {
      postAttempted = true;
    }
  });
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();

  await expect(dialog.getByText('Task title is required.')).toBeVisible();
  expect(postAttempted).toBe(false);

  const title = `${e2eTaskPrefix}Corrected ${Date.now().toString(36)}`;
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  const createPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/tasks'
  );
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const response = await createPromise;
  expect(response.status()).toBe(201);
  created.addTask(((await response.json()) as { id: number }).id);
  await expect(dialog).toBeHidden();
  await expect(
    page.locator('app-task-item .title', { hasText: title })
  ).toHaveCount(1);
});

test('does not expose one user’s task to another user', async ({ page }) => {
  const token = await apiToken(harvey);
  const title = `${e2eTaskPrefix}Private ${Date.now().toString(36)}`;
  const { status, body } = await taskApi<{ id: number }>(token, 'POST', '', {
    projectId: harveyInboxId,
    title,
    priority: 'low',
  });
  expect(status).toBe(201);
  created.addTask(body.id);

  await logIn(page, james.email, james.password);
  await page.goto(`${baseUrl}/projects/${jamesInboxId}/tasks/${body.id}/edit`);
  await expect(
    page.getByText('Task not found.', { exact: true })
  ).toBeVisible();
});
