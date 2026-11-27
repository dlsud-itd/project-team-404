import { expect, test, type Locator, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount } from '../support/database';
import {
  activeTasks,
  apiResponse,
  dragTo,
  expectUnchanged,
  james,
  SeedSnapshot,
  seededProjectId,
  seedUser,
  type SeedUser,
  type TaskRow,
} from '../support/sprint6';

/**
 * Kanban View end to end (Sprint 6: E2E-KAN-01, E2E-KAN-02).
 *
 * James's "Board Status - Project" comes from supabase/seeds/014_board_status.sql: three To Do,
 * two In Progress and three Done tasks. One To Do task is dragged by mouse to In Progress, then
 * to Done, checked as completed in the List view, then dragged back to To Do and checked as
 * active again. Each move is checked in the database too. afterEach puts the board status,
 * completion, positions and any completion rows back. These fixtures are not dated.
 */

const PROJECT = 'Board Status - Project';
const TASK = 'Board status seed - Todo 01';

let user: SeedUser;
let projectId: number;
let snapshot: SeedSnapshot;

function column(page: Page, key: 'todo' | 'inProgress' | 'done'): Locator {
  return page.locator(`app-board-column section[data-column="${key}"]`);
}

function card(scope: Locator, title: string): Locator {
  return scope.locator('li.slot').filter({ hasText: title });
}

async function taskRow(): Promise<TaskRow> {
  const row = (await activeTasks(user, projectId)).find(
    (r) => r.title === TASK
  );
  if (!row) throw new Error(`Seed task "${TASK}" is missing`);
  return row;
}

/** Drags the card into `key`'s column, below its last card, and waits for the save. */
async function dragCardTo(
  page: Page,
  key: 'todo' | 'inProgress' | 'done'
): Promise<void> {
  const target = column(page, key).locator('ul.list');
  const saved = apiResponse(page, 'PUT', /\/api\/tasks\/board\/reorder$/);
  const box = (await target.boundingBox())!;
  await dragTo(
    page,
    card(page.locator('app-board-view'), TASK),
    target,
    Math.max(box.height - 12, 8)
  );
  expect((await saved).status()).toBe(200);
  await expect(card(column(page, key), TASK)).toHaveCount(1);
}

async function switchTo(page: Page, name: string): Promise<void> {
  const link = page
    .locator('app-task-list app-view-switcher')
    .getByRole('link', { name, exact: true });
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'page');
}

test.beforeAll(async () => {
  user = await seedUser(james);
  projectId = await seededProjectId(user, PROJECT, '014_board_status.sql');
  const row = await taskRow();
  if (row.board_status !== 'todo' || row.is_done) {
    throw new Error(
      `"${TASK}" is not in To Do as seeded; run npm run supabase:local:seed (014_board_status.sql)`
    );
  }
  snapshot = await SeedSnapshot.take(james, user, [projectId]);
});

test.afterEach(async () => {
  try {
    await snapshot.restore();
    await expectUnchanged(snapshot);
  } finally {
    await restoreSeedAccount(james.email);
  }
});

test('drags a task To Do → In Progress → Done, sees it completed in List, and back to To Do', async ({
  page,
}) => {
  await logIn(page, james.email, james.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks?view=board`);
  await expect(card(column(page, 'todo'), TASK)).toHaveCount(1);
  await expect(column(page, 'todo').locator('.count')).toHaveText('3');
  await expect(column(page, 'inProgress').locator('.count')).toHaveText('2');

  // To Do → In Progress: still open.
  await dragCardTo(page, 'inProgress');
  await expect(column(page, 'todo').locator('.count')).toHaveText('2');
  await expect(column(page, 'inProgress').locator('.count')).toHaveText('3');
  await expect
    .poll(async () => {
      const row = await taskRow();
      return { status: row.board_status, done: row.is_done };
    })
    .toEqual({ status: 'in_progress', done: false });

  // In Progress → Done: completed.
  await dragCardTo(page, 'done');
  await expect(
    card(column(page, 'done'), TASK).locator('article.card')
  ).toHaveClass(/\bdone\b/);
  await expect
    .poll(async () => {
      const row = await taskRow();
      return {
        status: row.board_status,
        done: row.is_done,
        doneAt: row.done_at !== null,
      };
    })
    .toEqual({ status: 'done', done: true, doneAt: true });

  // The List view shows it under Completed.
  await switchTo(page, 'List');
  await expect(
    page
      .locator(
        'app-list-view [aria-labelledby="completed-heading"] app-task-item .title'
      )
      .filter({ hasText: TASK })
  ).toHaveCount(1);
  await expect(
    page
      .locator(
        'app-list-view [aria-labelledby="open-heading"] app-task-item .title'
      )
      .filter({ hasText: TASK })
  ).toHaveCount(0);

  // Done → To Do: active again.
  await switchTo(page, 'Board');
  await expect(card(column(page, 'done'), TASK)).toHaveCount(1);
  await dragCardTo(page, 'todo');
  await expect
    .poll(async () => {
      const row = await taskRow();
      return {
        status: row.board_status,
        done: row.is_done,
        doneAt: row.done_at,
      };
    })
    .toEqual({ status: 'todo', done: false, doneAt: null });

  await switchTo(page, 'List');
  await expect(
    page
      .locator(
        'app-list-view [aria-labelledby="open-heading"] app-task-item .title'
      )
      .filter({ hasText: TASK })
  ).toHaveCount(1);

  // Both are kept after a reload.
  await page.reload();
  await expect(
    page
      .locator(
        'app-list-view [aria-labelledby="open-heading"] app-task-item .title'
      )
      .filter({ hasText: TASK })
  ).toHaveCount(1);
});
