import { expect, test, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { restoreSeedAccount } from '../support/database';
import {
  activeTasks,
  addDays,
  apiResponse,
  expectSeededToday,
  expectUnchanged,
  james,
  monthDay,
  SeedSnapshot,
  seededProjectId,
  seedUser,
  todayFor,
  type SeedUser,
  type TaskRow,
} from '../support/sprint6';

/**
 * Task Streaks end to end (Sprint 6: E2E-STR-01 to E2E-STR-03).
 *
 * James's "Streak - Daily Review" project comes from supabase/seeds/012_streaks.sql:
 * - "Streak seed - Daily review" is a daily series completed for seven days (longest 7), then a
 *   missed day, then the four days up to yesterday (current 4), with today's occurrence open.
 * - "Streak seed - Missed day" was last completed three days ago: current 0, longest 7.
 * Both are dated relative to the day the seed ran, so the spec stops unless it ran today.
 * Completing creates a completion and the next occurrence; afterEach deletes both and puts the
 * completed task back.
 */

const PROJECT = 'Streak - Daily Review';
const DAILY = 'Streak seed - Daily review';
const MISSED = 'Streak seed - Missed day';

let user: SeedUser;
let projectId: number;
let snapshot: SeedSnapshot;

/** The series' tasks, oldest first; the seeded open occurrence is the first. */
async function series(title: string): Promise<TaskRow[]> {
  return (await activeTasks(user, projectId)).filter(
    (row) => row.title === title
  );
}

function tableRow(page: Page, title: string, done: boolean) {
  return page
    .locator('app-table-view tbody tr')
    .filter({ hasText: title })
    .filter({
      has: page.getByRole('checkbox', {
        name: `Mark ${title} ${done ? 'incomplete' : 'complete'}`,
      }),
    });
}

test.beforeAll(async () => {
  user = await seedUser(james);
  projectId = await seededProjectId(user, PROJECT, '012_streaks.sql');
  const [daily] = await series(DAILY);
  expectSeededToday(DAILY, daily?.scheduled_date ?? null, user);
  const [missed] = await series(MISSED);
  expectSeededToday(MISSED, missed?.scheduled_date ?? null, user);
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

test('completes a 4-day streak for 5 and shows the next occurrence and the dashboard entry', async ({
  page,
}) => {
  const today = todayFor(user);
  const tomorrow = addDays(today, 1);
  const [seeded] = await series(DAILY);

  await logIn(page, james.email, james.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks?view=table`);

  // Before: a 4-day streak, at risk because today's occurrence is still open.
  const open = tableRow(page, DAILY, false);
  await expect(open).toHaveCount(1);
  await expect(open.locator('app-streak-badge .count')).toHaveText('4 days');
  await expect(open.locator('app-streak-badge .badge')).toHaveAttribute(
    'aria-label',
    'Streak: 4 days, at risk'
  );

  const saved = apiResponse(
    page,
    'PUT',
    new RegExp(`/api/tasks/${seeded.task_id}$`)
  );
  await open.getByRole('checkbox', { name: `Mark ${DAILY} complete` }).check();
  expect((await saved).status()).toBe(200);

  // The completed occurrence now counts: 5 days.
  const done = tableRow(page, DAILY, true);
  await expect(done.locator('.status')).toHaveText('Done');
  await expect(done.locator('app-streak-badge .count')).toHaveText('5 days');

  // The server created tomorrow's occurrence in the same series.
  await expect
    .poll(async () =>
      (await series(DAILY))
        .filter((row) => !row.is_done)
        .map((row) => row.due_date)
    )
    .toEqual([tomorrow]);

  // After a reload the next occurrence is listed, open, due tomorrow, with the same streak.
  await page.reload();
  const next = tableRow(page, DAILY, false);
  await expect(next).toHaveCount(1);
  await expect(next.locator('.col-due')).toContainText(monthDay(tomorrow));
  await expect(next.locator('app-streak-badge .count')).toHaveText('5 days');
  await expect(tableRow(page, DAILY, true)).toHaveCount(1);

  // Its detail view shows the current and longest streak.
  await next.locator('a.title').click();
  await expect(page.locator('app-streak-detail .current')).toHaveText('5 days');
  await expect(page.locator('app-streak-detail .longest')).toHaveText('7 days');
  await expect(page.locator('app-streak-detail .last')).not.toHaveText(
    'Not yet'
  );

  // The dashboard lists the series as done today with its new count.
  await page.goto(`${baseUrl}/streak`);
  const row = page
    .locator('app-dashboard-streaks li.row')
    .filter({ hasText: DAILY });
  await expect(row).toHaveCount(1);
  await expect(row.locator('app-streak-badge .count')).toHaveText('5 days');
  await expect(row.locator('.done')).toHaveText('Done today');
});

test('shows the dashboard entry at risk with a Complete button before completing', async ({
  page,
}) => {
  await logIn(page, james.email, james.password);
  await page.goto(`${baseUrl}/streak`);

  const row = page
    .locator('app-dashboard-streaks li.row')
    .filter({ hasText: DAILY });
  await expect(row).toHaveCount(1);
  await expect(row.locator('app-streak-badge .count')).toHaveText('4 days');
  await expect(row.locator('.risk')).toHaveText('At risk · due today');
  await expect(
    row.getByRole('button', { name: `Complete ${DAILY}`, exact: true })
  ).toBeEnabled();
});

test('shows current 0 and the longest streak for a series that missed a day', async ({
  page,
}) => {
  const [missed] = await series(MISSED);

  await logIn(page, james.email, james.password);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks?view=table`);
  const row = tableRow(page, MISSED, false);
  await expect(row.locator('app-streak-badge .badge')).toHaveAttribute(
    'aria-label',
    'No streak yet'
  );
  await expect(row.locator('app-streak-badge .count')).toHaveText(
    'No streak yet'
  );

  await page.goto(
    `${baseUrl}/projects/${projectId}/tasks/${missed.task_id}/edit`
  );
  const detail = page.locator('app-streak-detail');
  await expect(detail.locator('.current')).toHaveText('No streak yet');
  await expect(detail.locator('.longest')).toHaveText('7 days');
  await expect(detail.locator('.last')).toContainText(
    monthDay(addDays(todayFor(user), -3))
  );
  await expect(detail.locator('.note')).toContainText(
    'The last occurrence was missed.'
  );
});
