import { expect, test, type Page, type Response } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  deleteServiceRoleRows,
  inboxProjectsForUser,
  labelRow,
  patchServiceRoleRows,
  restoreSeedAccount,
  serviceRoleRows,
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

/**
 * Labels & Priorities management end to end (Sprint 5: E2E-LPM-01 to E2E-LPM-04).
 *
 * Harvey starts with the default Low, Medium (default) and High levels and the Filtering, Review
 * and Personal labels (supabase/seeds/006 and 007). Alex, another seeded user, also has only the
 * three defaults. After each test the tasks and labels a test created are removed, and Harvey's
 * priority and label rows are written back exactly as the seed left them, by service role.
 */

const [, harvey, alex] = seedAccounts;
const created = new CreatedTaskData();

type PriorityRow = {
  priority_id: number;
  name: string;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

let userId: string;
let inboxId: number;
let priorities: PriorityRow[];
let taskState: Awaited<ReturnType<typeof seededTaskAndLabelState>>;

async function priorityRows(): Promise<PriorityRow[]> {
  return serviceRoleRows<PriorityRow>(
    'tbl_priority_level',
    new URLSearchParams({
      select:
        'priority_id,name,color,sort_order,is_default,created_at,updated_at,deleted_at',
      user_id: `eq.${userId}`,
      order: 'priority_id.asc',
    })
  );
}

/** A level's saved values; a trigger sets updated_at on every write, so it is left out. */
function comparable({ updated_at: _updatedAt, ...row }: PriorityRow) {
  return row;
}

/**
 * Puts Harvey's levels back as the seed had them and removes levels a test added. Only rows
 * that changed are written, so an untouched level keeps its timestamps. The order matters:
 * (user_id, sort_order) is unique even for deleted levels, and only one level may be the
 * default.
 */
async function restorePriorities(): Promise<void> {
  const write = (priorityId: number, values: Record<string, unknown>) =>
    patchServiceRoleRows(
      'tbl_priority_level',
      new URLSearchParams({ priority_id: `eq.${priorityId}` }),
      values
    );

  // 1. Levels a test added go first, so their sort_order is free again. Created tasks are
  //    already removed, and the app moves a deleted level's tasks elsewhere.
  const seeded = new Set(priorities.map((row) => row.priority_id));
  const extra = (await priorityRows()).filter(
    (row) => !seeded.has(row.priority_id)
  );
  if (extra.length) {
    await deleteServiceRoleRows(
      'tbl_priority_level',
      new URLSearchParams({
        priority_id: `in.(${extra.map((row) => row.priority_id).join(',')})`,
        user_id: `eq.${userId}`,
      })
    );
  }

  const current = await priorityRows();
  const changed = priorities.filter((row) => {
    const now = current.find((item) => item.priority_id === row.priority_id);
    return (
      !now ||
      JSON.stringify(comparable(now)) !== JSON.stringify(comparable(row))
    );
  });
  // 2. Clear a default the seed did not have.
  for (const row of current) {
    if (
      row.is_default &&
      !priorities.some(
        (seed) => seed.priority_id === row.priority_id && seed.is_default
      )
    ) {
      await write(row.priority_id, { is_default: false });
    }
  }
  // 3. Park changed levels on unused positions, so swapping two positions cannot collide.
  // sort_order is a smallint, so park above any real position but below 32767.
  for (const [index, row] of changed.entries()) {
    await write(row.priority_id, { sort_order: 30_000 + index });
  }
  // 4. Write the seeded values back.
  for (const row of changed) {
    const { priority_id, updated_at: _updatedAt, ...values } = row;
    await write(priority_id, values);
  }
}

/** Puts the seeded labels' order back, in case a test reordered them. */
async function restoreLabelOrder(): Promise<void> {
  if (!taskState) return;
  const current = (await seededTaskAndLabelState(userId)).labels;
  for (const label of taskState.labels) {
    const now = current.find((row) => row['label_id'] === label['label_id']);
    if (now?.['sort_order'] === label['sort_order']) continue;
    await patchServiceRoleRows(
      'tbl_label',
      new URLSearchParams({ label_id: `eq.${label['label_id']}` }),
      { sort_order: label['sort_order'], updated_at: label['updated_at'] }
    );
  }
}

function isPath(method: string, path: string | RegExp) {
  return (response: Response) =>
    response.request().method() === method &&
    (typeof path === 'string'
      ? new URL(response.url()).pathname === path
      : path.test(new URL(response.url()).pathname));
}

function levelNames(page: Page) {
  return page
    .getByRole('list', { name: 'Priority levels' })
    .locator('li.row .name');
}

function labelNames(page: Page) {
  return page
    .getByRole('list', { name: 'Labels', exact: true })
    .locator('.name');
}

async function openInbox(page: Page): Promise<void> {
  await page.goto(`${baseUrl}/projects/${inboxId}/tasks`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inbox' })
  ).toBeVisible();
}

/** The label options of the + New task form, in order; the dialog is closed again. */
async function taskFormLabels(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  const options = dialog.locator('.label-option');
  await expect(options.first()).toBeVisible();
  const names = (await options.allInnerTexts()).map((name) => name.trim());
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return names;
}

/** The label options of the task filter bar's Labels panel, in order. */
async function filterBarLabels(page: Page): Promise<string[]> {
  const chip = page
    .locator('app-task-filter-bar .chip')
    .filter({ hasText: /^\s*Labels/ });
  await chip.click();
  const options = page.locator('#task-filter-labels .option');
  await expect(options.first()).toBeVisible();
  const names = (await options.allInnerTexts()).map((name) => name.trim());
  await chip.click();
  return names;
}

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
  await removeLeftoverTaskData(userId);
  inboxId = (await inboxProjectsForUser(userId))[0].project_id;
});

test.beforeEach(async () => {
  priorities = await priorityRows();
  expect(
    priorities
      .filter((row) => row.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => `${row.name}${row.is_default ? '*' : ''}`)
  ).toEqual(['Low', 'Medium*', 'High']);
  taskState = await seededTaskAndLabelState(userId);
});

test.afterEach(async () => {
  try {
    await created.removeAll(userId);
    await removeLeftoverTaskData(userId);
    await restorePriorities();
    await restoreLabelOrder();
    expect((await priorityRows()).map(comparable)).toEqual(
      priorities.map(comparable)
    );
    expect(await seededTaskAndLabelState(userId)).toEqual(taskState);
  } finally {
    await restoreSeedAccount(harvey.email);
    await restoreSeedAccount(alex.email);
  }
});

test('creates Urgent, makes it the top default level, then deletes it and moves its tasks to High', async ({
  page,
  browser,
}) => {
  const high = priorities.find((row) => row.name === 'High')!;
  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/priorities`);
  await expect(levelNames(page)).toHaveText(['Low', 'Medium', 'High']);

  const createdLevel = page.waitForResponse(isPath('POST', '/api/priorities'));
  await page
    .getByLabel('Priority name', { exact: true })
    .first()
    .fill('Urgent');
  await page.getByRole('button', { name: 'Add priority', exact: true }).click();
  const createResponse = await createdLevel;
  expect(createResponse.status()).toBe(201);
  const { id: urgentId } = (await createResponse.json()) as { id: number };
  await expect(levelNames(page)).toHaveText([
    'Low',
    'Medium',
    'High',
    'Urgent',
  ]);

  for (let step = 0; step < 3; step++) {
    const reordered = page.waitForResponse(
      isPath('PUT', '/api/priorities/reorder')
    );
    await page
      .getByRole('button', { name: 'Move Urgent up', exact: true })
      .click();
    expect((await reordered).status()).toBe(200);
  }
  await expect(levelNames(page)).toHaveText([
    'Urgent',
    'Low',
    'Medium',
    'High',
  ]);
  await expect(
    page.getByRole('button', { name: 'Move Urgent up' })
  ).toBeDisabled();

  const defaulted = page.waitForResponse(
    isPath('PUT', `/api/priorities/${urgentId}/default`)
  );
  await page
    .getByRole('button', { name: 'Set Urgent as default', exact: true })
    .click();
  expect((await defaulted).status()).toBe(200);
  const urgentRow = page.locator('li.row', {
    has: page.locator('.name', { hasText: /^Urgent$/ }),
  });
  await expect(urgentRow.locator('.badge')).toHaveText('Default');

  // Saved, and still so after a reload.
  await page.reload();
  await expect(levelNames(page)).toHaveText([
    'Urgent',
    'Low',
    'Medium',
    'High',
  ]);
  await expect(urgentRow.locator('.badge')).toHaveText('Default');
  const saved = (await priorityRows()).filter((row) => row.deleted_at === null);
  expect(saved.find((row) => row.priority_id === urgentId)).toMatchObject({
    name: 'Urgent',
    is_default: true,
  });
  expect(saved.sort((a, b) => a.sort_order - b.sort_order)[0].priority_id).toBe(
    urgentId
  );

  // A new task gets the default level and sorts first by priority.
  const title = `${e2eTaskPrefix}Urgent ${Date.now().toString(36)}`;
  await openInbox(page);
  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await expect(dialog.getByLabel('Priority', { exact: true })).toHaveValue(
    /.+/
  );
  await expect(
    dialog.getByLabel('Priority', { exact: true }).locator('option:checked')
  ).toHaveText('Urgent');
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  const createdTask = page.waitForResponse(isPath('POST', '/api/tasks'));
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const taskResponse = await createdTask;
  expect(taskResponse.status()).toBe(201);
  const { id: taskId } = (await taskResponse.json()) as { id: number };
  created.addTask(taskId);
  expect(await taskRow(taskId)).toMatchObject({ title, priority_id: urgentId });

  await page.locator('app-task-list app-sort-menu .trigger').click();
  const sorted = page.waitForResponse(
    (response) =>
      isPath('GET', '/api/tasks')(response) &&
      new URL(response.url()).searchParams.get('orderBy') === 'priority'
  );
  await page
    .getByRole('menuitemradio', { name: 'Priority', exact: true })
    .click();
  expect((await sorted).status()).toBe(200);
  await expect(
    page.locator('app-task-list app-task-item .title').first()
  ).toHaveText(title);

  // Deleting Urgent asks where its tasks go; they move to High.
  await page.goto(`${baseUrl}/settings/priorities`);
  await page
    .getByRole('button', { name: 'Delete Urgent', exact: true })
    .click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete “Urgent”?' });
  await confirm
    .getByLabel(/Move its tasks to|Move tasks to|Reassign/)
    .selectOption({
      label: 'High',
    });
  const deleted = page.waitForResponse(
    isPath('DELETE', `/api/priorities/${urgentId}`)
  );
  await confirm
    .getByRole('button', { name: 'Delete level', exact: true })
    .click();
  const deleteResponse = await deleted;
  expect(deleteResponse.status()).toBe(200);
  expect(new URL(deleteResponse.url()).searchParams.get('reassignTo')).toBe(
    String(high.priority_id)
  );
  await expect(levelNames(page)).toHaveText(['Low', 'Medium', 'High']);
  expect(await taskRow(taskId)).toMatchObject({
    priority_id: high.priority_id,
  });

  // Another user's levels were never touched.
  const other = await browser.newContext();
  try {
    const alexPage = await other.newPage();
    await logIn(alexPage, alex.email, alex.password);
    await alexPage.goto(`${baseUrl}/settings/priorities`);
    await expect(levelNames(alexPage)).toHaveText(['Low', 'Medium', 'High']);
  } finally {
    await other.close();
  }
});

test('creates, renames and deletes a label, and the task form and filter bar follow', async ({
  page,
}) => {
  const suffix = Date.now().toString(36);
  const name = `${e2eLabelPrefix}Flow ${suffix}`;
  const renamed = `${e2eLabelPrefix}Renamed ${suffix}`;
  const seededNames = taskState.labels
    .filter((row) => row['archived_at'] === null)
    .sort((a, b) => Number(a['sort_order']) - Number(b['sort_order']))
    .map((row) => String(row['name']));

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/labels`);
  const newLabel = page.getByRole('region', { name: 'New label' });
  await newLabel.getByLabel('Label name', { exact: true }).fill(name);
  const createdLabel = page.waitForResponse(isPath('POST', '/api/labels'));
  await newLabel
    .getByRole('button', { name: 'Add label', exact: true })
    .click();
  const createResponse = await createdLabel;
  expect(createResponse.status()).toBe(201);
  const { id: labelId } = (await createResponse.json()) as { id: number };
  created.addLabel(labelId);
  await expect(labelNames(page)).toHaveText([...seededNames, name]);

  await openInbox(page);
  expect(await taskFormLabels(page)).toEqual([...seededNames, name]);
  expect(await filterBarLabels(page)).toEqual([...seededNames, name]);

  await page.goto(`${baseUrl}/settings/labels`);
  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await page.locator(`#label-${labelId}-editor-name`).fill(renamed);
  const updated = page.waitForResponse(isPath('PUT', `/api/labels/${labelId}`));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await updated).status()).toBe(200);
  await expect(labelNames(page)).toHaveText([...seededNames, renamed]);
  expect(await labelRow(labelId)).toMatchObject({ name: renamed });

  await openInbox(page);
  expect(await taskFormLabels(page)).toEqual([...seededNames, renamed]);
  expect(await filterBarLabels(page)).toEqual([...seededNames, renamed]);

  await page.goto(`${baseUrl}/settings/labels`);
  await page
    .getByRole('button', { name: `Delete ${renamed}`, exact: true })
    .click();
  await page
    .getByRole('alertdialog', { name: `Delete “${renamed}”?` })
    .getByRole('button', { name: 'Delete label', exact: true })
    .click();
  await expect(labelNames(page)).toHaveText(seededNames);
  expect(await labelRow(labelId)).toBeNull();

  await openInbox(page);
  expect(await taskFormLabels(page)).toEqual(seededNames);
  expect(await filterBarLabels(page)).toEqual(seededNames);
});

// The backend has no PUT /api/labels/reorder route (it falls through to PUT /api/labels/:labelId,
// which answers 400), so the page puts the old order back. Enable this once the route exists.
test.fixme('reorders labels, and the order is kept after reload and in the task form', async ({
  page,
}) => {
  const seededNames = taskState.labels
    .filter((row) => row['archived_at'] === null)
    .sort((a, b) => Number(a['sort_order']) - Number(b['sort_order']))
    .map((row) => String(row['name']));
  expect(seededNames.length).toBeGreaterThan(1);
  const [first, second, ...rest] = seededNames;
  const moved = [second, first, ...rest];

  await logIn(page, harvey.email, harvey.password);
  await page.goto(`${baseUrl}/settings/labels`);
  await expect(labelNames(page)).toHaveText(seededNames);

  const reordered = page.waitForResponse(isPath('PUT', '/api/labels/reorder'));
  await page
    .getByRole('button', { name: `Move ${second} up`, exact: true })
    .click();
  expect((await reordered).status()).toBe(200);
  await expect(labelNames(page)).toHaveText(moved);

  await page.reload();
  await expect(labelNames(page)).toHaveText(moved);
  await openInbox(page);
  expect(await taskFormLabels(page)).toEqual(moved);
  expect(await filterBarLabels(page)).toEqual(moved);
});
