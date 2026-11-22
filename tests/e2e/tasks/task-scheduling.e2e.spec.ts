import { expect, test, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  inboxProjectsForUser,
  restoreSeedAccount,
  taskRow,
} from '../support/database';
import { userIdFor } from '../support/projects';
import { seedAccounts } from '../support/seed-data';
import {
  CreatedTaskData,
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

async function openTaskList(page: Page): Promise<void> {
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/projects/${inboxId}/tasks`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inbox' })
  ).toBeVisible();
}

function relativeDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function weekdayFor(date: string): string {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][new Date(`${date}T12:00:00Z`).getUTCDay()];
}

test('creates a weekly task with relative scheduled and due dates that survive reload', async ({
  page,
}) => {
  const title = `${e2eTaskPrefix}Schedule ${Date.now().toString(36)}`;
  const scheduledDate = relativeDate(2);
  const dueDate = relativeDate(4);
  await openTaskList(page);

  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog.getByLabel(/Scheduled date/).fill(scheduledDate);
  await dialog.getByLabel(/Due date/).fill(dueDate);
  await dialog.getByRole('radio', { name: 'Weekly' }).check();
  await dialog.getByRole('checkbox', { name: weekdayFor(dueDate) }).check();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/tasks'
  );
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { id } = (await response.json()) as { id: number };
  created.addTask(id);

  expect(await taskRow(id)).toMatchObject({
    user_id: userId,
    project_id: inboxId,
    title,
    scheduled_date: scheduledDate,
    due_date: dueDate,
    recurrence: 'weekly',
  });

  await page.reload();
  const task = page.locator('app-task-item').filter({ hasText: title });
  await expect(task).toBeVisible();
  await expect(task.locator('.title')).toHaveText(title);
});
