import { expect, test, type Page, type Response } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import {
  patchServiceRoleRows,
  restoreSeedAccount,
  serviceRoleRows,
} from '../support/database';
import {
  apiToken,
  restoreSeededProjects,
  seededProjects,
  userIdFor,
  type SeedProjectState,
} from '../support/projects';
import { seedAccounts } from '../support/seed-data';

/**
 * Archive end to end (Sprint 5: E2E-ARC-01 to E2E-ARC-05).
 *
 * Harvey archives the seeded "Archive fixture - active task" (supabase/seeds/009_archiving.sql),
 * the Review label (006_filtering.sql, on active tasks such as "Filter fixture 03") and the
 * Weekly Notes project (010_search.sql), then restores each from /archive. James's archived
 * items must never show up for Harvey. After each test the archive state of Harvey's tasks,
 * labels and projects is put back as the seed had it, and the test fails if it differs.
 */

const [james, harvey] = seedAccounts;
const TASK = 'Archive fixture - active task';
const TASK_PROJECT = 'Filtering - Client Work';
const LABEL = 'Review';
const LABELLED_TASK = 'Filter fixture 03: future high';
const PROJECT = 'Weekly Notes';

type TaskRow = {
  task_id: number;
  project_id: number;
  title: string;
  archived_at: string | null;
};
type LabelRow = { label_id: number; name: string; archived_at: string | null };

let userId: string;
let jamesId: string;
let taskRows: TaskRow[];
let labelRows: LabelRow[];
let projectState: SeedProjectState[];

async function tasksOf(owner: string): Promise<TaskRow[]> {
  return serviceRoleRows<TaskRow>(
    'tbl_task',
    new URLSearchParams({
      select: 'task_id,project_id,title,archived_at',
      user_id: `eq.${owner}`,
      deleted_at: 'is.null',
      order: 'task_id.asc',
    })
  );
}

async function labelsOf(owner: string): Promise<LabelRow[]> {
  return serviceRoleRows<LabelRow>(
    'tbl_label',
    new URLSearchParams({
      select: 'label_id,name,archived_at',
      user_id: `eq.${owner}`,
      order: 'label_id.asc',
    })
  );
}

const archivedFlags = <T extends { archived_at: string | null }>(rows: T[]) =>
  rows.map(({ archived_at, ...row }) => ({
    ...row,
    archived: archived_at !== null,
  }));

/** Puts back archived_at on every task and label whose archive state a test changed. */
async function restoreArchiveState(): Promise<void> {
  const tasksNow = await tasksOf(userId);
  for (const seed of taskRows) {
    const now = tasksNow.find((row) => row.task_id === seed.task_id);
    if (now && (now.archived_at === null) !== (seed.archived_at === null)) {
      await patchServiceRoleRows(
        'tbl_task',
        new URLSearchParams({ task_id: `eq.${seed.task_id}` }),
        { archived_at: seed.archived_at }
      );
    }
  }
  const labelsNow = await labelsOf(userId);
  for (const seed of labelRows) {
    const now = labelsNow.find((row) => row.label_id === seed.label_id);
    if (now && (now.archived_at === null) !== (seed.archived_at === null)) {
      await patchServiceRoleRows(
        'tbl_label',
        new URLSearchParams({ label_id: `eq.${seed.label_id}` }),
        { archived_at: seed.archived_at }
      );
    }
  }
  await restoreSeededProjects(await apiToken(harvey), projectState);
}

function isArchivePut(path: string, isArchived: boolean) {
  return (response: Response) =>
    response.request().method() === 'PUT' &&
    new URL(response.url()).pathname === `/api/${path}/archive` &&
    response.request().postDataJSON()?.isArchived === isArchived;
}

async function openProjectTasks(
  page: Page,
  projectId: number,
  name: string
): Promise<void> {
  await page.goto(`${baseUrl}/projects/${projectId}/tasks`);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

function taskTitles(page: Page) {
  return page.locator('app-task-list app-task-item .title');
}

/** The label choices of the + New task form; the dialog is closed again. */
async function pickerLabels(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: '+ New task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await expect(dialog.locator('.label-option').first()).toBeVisible();
  const names = (await dialog.locator('.label-option').allInnerTexts()).map(
    (n) => n.trim()
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return names;
}

async function openArchiveTab(
  page: Page,
  tab: 'All' | 'Tasks' | 'Projects' | 'Labels'
) {
  const type = tab.toLowerCase();
  const loaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/archive' &&
      new URL(response.url()).searchParams.get('type') ===
        (tab === 'All' ? 'all' : type)
  );
  if (tab === 'All') await page.goto(`${baseUrl}/archive`);
  else await page.locator(`#archive-tab-${type}`).click();
  expect((await loaded).status()).toBe(200);
  return page.locator('app-archive-page li.row .title');
}

test.beforeAll(async () => {
  userId = await userIdFor(harvey);
  jamesId = await userIdFor(james);
});

test.beforeEach(async () => {
  taskRows = await tasksOf(userId);
  labelRows = await labelsOf(userId);
  projectState = await seededProjects(userId);
  expect(taskRows.find((row) => row.title === TASK)?.archived_at).toBeNull();
  expect(labelRows.find((row) => row.name === LABEL)?.archived_at).toBeNull();
  expect(projectState.find((row) => row.name === PROJECT)?.is_archived).toBe(
    false
  );
});

test.afterEach(async () => {
  try {
    await restoreArchiveState();
    expect(archivedFlags(await tasksOf(userId))).toEqual(
      archivedFlags(taskRows)
    );
    expect(archivedFlags(await labelsOf(userId))).toEqual(
      archivedFlags(labelRows)
    );
    expect(await seededProjects(userId)).toEqual(projectState);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

test('archives a task with Undo, a label and a project, then restores each from /archive', async ({
  page,
}) => {
  const task = taskRows.find((row) => row.title === TASK)!;
  const project = projectState.find((row) => row.name === PROJECT)!;
  await logIn(page, harvey.email, harvey.password);

  // A task: Archive, Undo, then Archive for real.
  await openProjectTasks(page, task.project_id, TASK_PROJECT);
  await expect(taskTitles(page)).toContainText([TASK]);
  let saved = page.waitForResponse(isArchivePut(`tasks/${task.task_id}`, true));
  await page
    .getByRole('button', { name: `Archive task ${TASK}`, exact: true })
    .click();
  expect((await saved).status()).toBe(200);
  const toast = page
    .getByRole('status')
    .filter({ hasText: `Task “${TASK}” archived` });
  await expect(toast).toBeVisible();
  const undone = page.waitForResponse(
    isArchivePut(`tasks/${task.task_id}`, false)
  );
  await toast.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await undone).status()).toBe(200);
  await expect(taskTitles(page)).toContainText([TASK]);
  expect(
    (await tasksOf(userId)).find((row) => row.task_id === task.task_id)
      ?.archived_at
  ).toBeNull();

  saved = page.waitForResponse(isArchivePut(`tasks/${task.task_id}`, true));
  await page
    .getByRole('button', { name: `Archive task ${TASK}`, exact: true })
    .click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(taskTitles(page).first()).toBeVisible();
  await expect(taskTitles(page)).not.toContainText([TASK]);
  // Gone from the home dashboard's task list too.
  await page.goto(`${baseUrl}/home?tab=tasks`);
  const homeTitles = page.locator('app-tasks-page .title');
  await expect(homeTitles.first()).toBeVisible();
  expect(await homeTitles.allInnerTexts()).not.toContain(TASK);

  // A label: gone from the picker, still shown (greyed) on the task that has it.
  await page.goto(`${baseUrl}/settings/labels`);
  saved = page.waitForResponse((response) =>
    /\/api\/labels\/\d+\/archive$/.test(new URL(response.url()).pathname)
  );
  await page
    .getByRole('button', { name: `Archive ${LABEL}`, exact: true })
    .click();
  expect((await saved).status()).toBe(200);
  await openProjectTasks(page, task.project_id, TASK_PROJECT);
  expect(await pickerLabels(page)).not.toContain(LABEL);
  const chip = page
    .locator('app-task-item')
    .filter({ hasText: LABELLED_TASK })
    .locator('.labels .label', { hasText: LABEL });
  await expect(chip).toHaveClass(/archived/);
  await expect(chip).toHaveAttribute('title', `${LABEL} (archived)`);

  // A project, from the project switcher; the Inbox has no Archive action there.
  await page.goto(`${baseUrl}/projects/organize`);
  const switcher = page.locator('app-project-switcher');
  await expect(switcher.locator('.item.inbox')).toBeVisible();
  await expect(
    switcher.locator('.item.inbox').getByRole('button', { name: /^Archive/ })
  ).toHaveCount(0);
  saved = page.waitForResponse(
    isArchivePut(`projects/${project.project_id}`, true)
  );
  await switcher
    .getByRole('button', { name: `Archive ${PROJECT}`, exact: true })
    .click();
  expect((await saved).status()).toBe(200);
  // Out of the active projects and into the switcher's Archived group.
  const activeProjects = switcher.locator(
    'section[aria-labelledby="switcher-projects-heading"] .item .name'
  );
  await expect(
    activeProjects.filter({ hasText: new RegExp(`^${PROJECT}$`) })
  ).toHaveCount(0);
  await expect(
    switcher.locator('details.archived .item .name', { hasText: PROJECT })
  ).toHaveCount(1);

  // /archive lists all three, each under its own tab.
  await expect(await openArchiveTab(page, 'All')).toContainText([TASK]);
  await expect(await openArchiveTab(page, 'Tasks')).toContainText([TASK]);
  await expect(await openArchiveTab(page, 'Projects')).toContainText([PROJECT]);
  await expect(await openArchiveTab(page, 'Labels')).toContainText([LABEL]);

  // The archived task opens read-only.
  await page.goto(
    `${baseUrl}/projects/${task.project_id}/tasks/${task.task_id}/edit`
  );
  await expect(page.locator('.archived-banner')).toContainText(
    'This task is archived and read-only. Restore it to make changes.'
  );
  await expect(page.locator('#task-title')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Save changes' })
  ).toBeDisabled();

  // Restore each from /archive; each is back where it was.
  await openArchiveTab(page, 'All');
  for (const [kind, name, path] of [
    ['task', TASK, `tasks/${task.task_id}`],
    ['project', PROJECT, `projects/${project.project_id}`],
    ['label', LABEL, null],
  ] as const) {
    const restored = page.waitForResponse((response) =>
      path
        ? isArchivePut(path, false)(response)
        : /\/api\/labels\/\d+\/archive$/.test(new URL(response.url()).pathname)
    );
    await page
      .getByRole('button', { name: `Restore ${kind} ${name}`, exact: true })
      .click();
    expect((await restored).status()).toBe(200);
    await expect(
      page
        .locator('app-archive-page li.row .title')
        .filter({ hasText: new RegExp(`^${name}$`) })
    ).toHaveCount(0);
  }

  await openProjectTasks(page, task.project_id, TASK_PROJECT);
  await expect(taskTitles(page)).toContainText([TASK]);
  expect(await pickerLabels(page)).toContain(LABEL);
  // The restored project still has its tasks.
  const projectTasks = taskRows.filter(
    (row) => row.project_id === project.project_id && row.archived_at === null
  );
  expect(projectTasks.length).toBeGreaterThan(0);
  await openProjectTasks(page, project.project_id, PROJECT);
  await expect(taskTitles(page)).toHaveCount(projectTasks.length);
  await expect(taskTitles(page)).toContainText(
    projectTasks.map((row) => row.title)
  );

  await page.goto(`${baseUrl}/projects/organize`);
  await expect(
    page.locator(
      'app-project-switcher section[aria-labelledby="switcher-projects-heading"] .item .name',
      {
        hasText: PROJECT,
      }
    )
  ).toHaveCount(1);
});

test("never shows another user's archived items", async ({ page }) => {
  const jamesArchived = (await tasksOf(jamesId))
    .filter((row) => row.archived_at !== null)
    .map((row) => row.title);
  const harveyArchivedTasks = taskRows.filter(
    (row) => row.archived_at !== null
  );
  expect(jamesArchived.length).toBeGreaterThan(0);

  await logIn(page, harvey.email, harvey.password);
  await openArchiveTab(page, 'All');
  const rows = await openArchiveTab(page, 'Tasks');
  await expect(rows.first()).toBeVisible();
  // Every archived task Harvey has fits on the first page, and the count matches the server's.
  await expect(page.locator('#archive-tab-tasks .count')).toHaveText(
    String(harveyArchivedTasks.length)
  );
  const shown = (await rows.allInnerTexts()).map((title) => title.trim());
  expect(shown.sort()).toEqual(
    harveyArchivedTasks.map((row) => row.title).sort()
  );
  for (const title of jamesArchived) {
    if (!harveyArchivedTasks.some((row) => row.title === title))
      expect(shown).not.toContain(title);
  }
});
