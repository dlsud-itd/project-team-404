import { expect, test, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  inboxProjectsForUser,
  labelRow,
  restoreSeedAccount,
  taskLabelRowsForUser,
  taskRow,
} from '../support/database';
import { userIdFor } from '../support/projects';
import { seedAccounts } from '../support/seed-data';
import {
  CreatedTaskData,
  e2eLabelPrefix,
  e2eTaskPrefix,
  removeLeftoverTaskData,
  seededTaskAndLabelState,
} from '../support/tasks';

const [, harvey] = seedAccounts;
const created = new CreatedTaskData();
let userId: string;
let inboxId: number;
let seedState: Awaited<ReturnType<typeof seededTaskAndLabelState>>;

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
  await removeLeftoverTaskData(userId);
  inboxId = (await inboxProjectsForUser(userId))[0].project_id;
  seedState = await seededTaskAndLabelState(userId);
});

test.afterEach(async () => {
  try {
    await created.removeAll(userId);
    await removeLeftoverTaskData(userId);
    expect(await seededTaskAndLabelState(userId)).toEqual(seedState);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

async function createTask(
  page: Page,
  title: string,
  priority: 'High' | 'Medium' | 'Low',
  labelName?: string
): Promise<number> {
  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog
    .getByLabel('Priority', { exact: true })
    .selectOption({ label: priority });
  if (labelName)
    await dialog.getByRole('checkbox', { name: labelName }).check();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/tasks'
  );
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { id, priority: actualPriority } = (await response.json()) as {
    id: number;
    priority: string;
  };
  expect(actualPriority).toBe(priority.toLowerCase());
  created.addTask(id);
  if (labelName) {
    await expect(
      page
        .locator('app-task-item')
        .filter({ hasText: title })
        .locator('.labels')
    ).toContainText(labelName);
  }
  return id;
}

test('creates, renames, rejects duplicate names and deletes a label in settings', async ({
  page,
}) => {
  const name = `${e2eLabelPrefix}Manage ${Date.now().toString(36)}`;
  const renamed = `${name} updated`;
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/labels`);
  const newLabel = page.getByRole('region', { name: 'New label' });

  await newLabel.getByLabel('Label name', { exact: true }).fill(name);
  const createPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/labels'
  );
  await newLabel
    .getByRole('button', { name: 'Add label', exact: true })
    .click();
  const createResponse = await createPromise;
  expect(createResponse.status()).toBe(201);
  const { id } = (await createResponse.json()) as { id: number };
  created.addLabel(id);
  await expect(page.getByRole('list', { name: 'Labels' })).toContainText(name);
  expect(await labelRow(id)).toMatchObject({ user_id: userId, name });

  // Duplicate names are caught as the user types, before anything is sent.
  await newLabel.getByLabel('Label name', { exact: true }).fill(name);
  await expect(newLabel.locator('#new-label-status')).toHaveText(
    `Label “${name}” already exists.`
  );
  await expect(
    newLabel.getByRole('button', { name: 'Add label', exact: true })
  ).toBeDisabled();
  await newLabel.getByLabel('Label name', { exact: true }).fill('');

  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await page.locator(`#label-${id}-editor-name`).fill(renamed);
  const updatePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/api/labels/${id}`
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await updatePromise).status()).toBe(200);
  await expect(page.getByRole('list', { name: 'Labels' })).toContainText(
    renamed
  );
  expect(await labelRow(id)).toMatchObject({ user_id: userId, name: renamed });

  await page
    .getByRole('button', { name: `Delete ${renamed}`, exact: true })
    .click();
  const confirmation = page.getByRole('alertdialog', {
    name: `Delete “${renamed}”?`,
  });
  await confirmation
    .getByRole('button', { name: 'Delete label', exact: true })
    .click();
  await expect(page.getByRole('list', { name: 'Labels' })).not.toContainText(
    renamed
  );
  expect(await labelRow(id)).toBeNull();
});

test('filters by priority and label and sorts matching tasks by title', async ({
  page,
}) => {
  const suffix = Date.now().toString(36);
  const labelName = `${e2eLabelPrefix}Filter ${suffix}`;
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/labels`);
  const newLabel = page.getByRole('region', { name: 'New label' });
  await newLabel.getByLabel('Label name', { exact: true }).fill(labelName);
  const labelResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/labels'
  );
  await newLabel
    .getByRole('button', { name: 'Add label', exact: true })
    .click();
  const labelResponse = await labelResponsePromise;
  expect(labelResponse.status()).toBe(201);
  const { id: labelId } = (await labelResponse.json()) as { id: number };
  created.addLabel(labelId);

  await page.goto(`${baseUrl}/projects/${inboxId}/tasks`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inbox' })
  ).toBeVisible();
  const zuluTitle = `${e2eTaskPrefix}Zulu ${suffix}`;
  const alphaTitle = `${e2eTaskPrefix}Alpha ${suffix}`;
  const lowTitle = `${e2eTaskPrefix}Low ${suffix}`;
  const zuluId = await createTask(page, zuluTitle, 'High', labelName);
  const alphaId = await createTask(page, alphaTitle, 'High', labelName);
  const lowId = await createTask(page, lowTitle, 'Low');

  expect(await taskRow(zuluId)).toMatchObject({ title: zuluTitle });
  expect(await taskRow(alphaId)).toMatchObject({ title: alphaTitle });
  expect(await taskRow(lowId)).toMatchObject({ title: lowTitle });
  expect(await taskLabelRowsForUser(userId)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ task_id: zuluId, label_id: labelId }),
      expect.objectContaining({ task_id: alphaId, label_id: labelId }),
    ])
  );

  await page.getByLabel('Priority', { exact: true }).selectOption('high');
  const highTitles = await page
    .locator('app-task-item .title')
    .allTextContents();
  expect(highTitles).toEqual(expect.arrayContaining([zuluTitle, alphaTitle]));
  expect(highTitles).not.toContain(lowTitle);
  await page.getByLabel('Label', { exact: true }).selectOption(String(labelId));
  await page.getByLabel('Sort by', { exact: true }).selectOption('title');
  await page.getByLabel('Direction', { exact: true }).selectOption('asc');
  await expect(page.locator('app-task-item .title')).toHaveText([
    alphaTitle,
    zuluTitle,
  ]);
  await expect(page).toHaveURL(/priority=high/);

  const reloadRequest = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/tasks'
  );
  await page.reload();
  const reloadedTasksResponse = await reloadRequest;
  expect(
    new URL(reloadedTasksResponse.url()).searchParams.get('priority')
  ).toBe('high');
  expect(new URL(page.url()).searchParams.get('priority')).toBe('high');
  await expect(page.getByLabel('Priority', { exact: true })).toHaveValue(
    'high'
  );
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue(
    String(labelId)
  );
  await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue(
    'title'
  );
  await expect(page.getByLabel('Direction', { exact: true })).toHaveValue(
    'asc'
  );
  await expect(page.locator('app-task-item .title')).toHaveText([
    alphaTitle,
    zuluTitle,
  ]);

  await page
    .getByRole('link', { name: `Edit ${alphaTitle}`, exact: true })
    .click();
  const editForm = page.locator('app-task-form');
  const selectedLabel = editForm.getByRole('checkbox', { name: labelName });
  await expect(selectedLabel).toBeChecked();
  await selectedLabel.uncheck();
  const removeLabelPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname ===
        `/api/tasks/${alphaId}/labels/${labelId}`
  );
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await removeLabelPromise).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('Changes saved.');
  await page.locator('a.back').click();
  await page.reload();
  const alphaTask = page
    .locator('app-task-item')
    .filter({ hasText: alphaTitle });
  await expect(alphaTask.locator('.labels')).toHaveCount(0);
  expect(
    (await taskLabelRowsForUser(userId)).some(
      (row) => row['task_id'] === alphaId && row['label_id'] === labelId
    )
  ).toBe(false);
});
