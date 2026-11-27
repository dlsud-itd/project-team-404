import { expect, test, type Locator, type Page } from '@playwright/test';
import { baseUrl, logIn } from '../support/auth';
import { localDate } from '../support/dashboard';
import { restoreSeedAccount } from '../support/database';
import {
  activeTasks,
  addDays,
  apiResponse,
  expectSeededToday,
  expectUnchanged,
  harvey,
  SeedSnapshot,
  seededProjectId,
  seedUser,
  todayFor,
  type SeedUser,
  type TaskRow,
} from '../support/sprint6';

/**
 * Timeline View end to end (Sprint 6: E2E-TML-01).
 *
 * Harvey's "Timeline - Personal" and "Timeline - Work" projects come from
 * supabase/seeds/013_timeline.sql. "Starts before week" and "Ends after week" span the edges of
 * the week the seed ran in, "Overdue" ended two days before it, and "Multi-day" runs from the
 * next day for four days. Each bar's expected span is worked out from its database row the way
 * the API does (scheduled or due date to the deadline's local date, or the due date), and the
 * bar is checked against the day columns on screen: it starts at the left edge of its first
 * visible day and ends at the right edge of its last, cut where it leaves the window. The tasks
 * are dated relative to the day the seed ran, so the spec stops unless it ran today. Nothing is
 * changed; afterEach checks that.
 */

const PERSONAL = 'Timeline - Personal';
const WORK = 'Timeline - Work';
const MULTI_DAY = 'Timeline fixture - Multi-day';
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
/** How far a bar's edge may sit from its day column's edge, in CSS pixels (bar insets). */
const EDGE_TOLERANCE = 8;

let user: SeedUser;
let personalId: number;
let workId: number;
let snapshot: SeedSnapshot;

type Window = { from: string; to: string };
type Span = { title: string; start: string; end: string };

/** The bar the API sends for a task, or null for an undated one. */
function spanOf(row: TaskRow): Span | null {
  const start = row.scheduled_date ?? row.due_date;
  if (!start) return null;
  const end = row.deadline
    ? localDate(new Date(row.deadline), user.timeZone)
    : (row.due_date ?? start);
  return { title: row.title, start, end: end < start ? start : end };
}

async function openSpans(projectId: number): Promise<Span[]> {
  return (await activeTasks(user, projectId))
    .filter((row) => !row.is_done)
    .map(spanOf)
    .filter((span): span is Span => span !== null);
}

function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

function weekOf(date: string): Window {
  const from = mondayOf(date);
  return { from, to: addDays(from, 6) };
}

function monthOf(date: string): Window {
  const [year, month] = date.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(last)}`,
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000
  );
}

function bar(page: Page, title: string): Locator {
  return page
    .locator('app-timeline-view app-timeline-bar')
    .filter({ has: page.locator('button.title', { hasText: title }) });
}

/** Checks every open bar of the project against the day columns of `window`. */
async function expectBarsPlaced(
  page: Page,
  spans: Span[],
  window: Window
): Promise<void> {
  const days = page.locator('app-timeline-view .days .day');
  await expect(days).toHaveCount(daysBetween(window.from, window.to) + 1);
  let shown = 0;
  for (const span of spans) {
    const host = bar(page, span.title);
    if (span.end < window.from || span.start > window.to) {
      await expect(host).toBeHidden();
      continue;
    }
    shown++;
    const first = span.start < window.from ? window.from : span.start;
    const last = span.end > window.to ? window.to : span.end;
    const box = host.locator('.bar');
    await expect(box).toBeVisible();
    const barBox = (await box.boundingBox())!;
    const startDay = (await days
      .nth(daysBetween(window.from, first))
      .boundingBox())!;
    const endDay = (await days
      .nth(daysBetween(window.from, last))
      .boundingBox())!;
    expect
      .soft(Math.abs(barBox.x - startDay.x), `${span.title} starts on ${first}`)
      .toBeLessThanOrEqual(EDGE_TOLERANCE);
    expect
      .soft(
        Math.abs(barBox.x + barBox.width - (endDay.x + endDay.width)),
        `${span.title} ends on ${last}`
      )
      .toBeLessThanOrEqual(EDGE_TOLERANCE);
    // A bar cut by the window's edge says so.
    const classes = (await box.getAttribute('class')) ?? '';
    expect
      .soft(/\bcut-start\b/.test(classes), `${span.title} cut at the start`)
      .toBe(span.start < window.from);
    expect
      .soft(/\bcut-end\b/.test(classes), `${span.title} cut at the end`)
      .toBe(span.end > window.to);
  }
  expect(shown, 'at least one seeded bar crosses this window').toBeGreaterThan(
    0
  );
}

async function openTimeline(
  page: Page,
  projectId: number,
  window: Window
): Promise<void> {
  const loaded = apiResponse(page, 'GET', /\/api\/tasks\/timeline$/);
  await page.goto(`${baseUrl}/projects/${projectId}/tasks?view=timeline`);
  const response = await loaded;
  expect(response.status()).toBe(200);
  const url = new URL(response.url());
  expect({
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  }).toEqual(window);
}

test.beforeAll(async () => {
  user = await seedUser(harvey);
  personalId = await seededProjectId(user, PERSONAL, '013_timeline.sql');
  workId = await seededProjectId(user, WORK, '013_timeline.sql');
  const multiDay = (await activeTasks(user, workId)).find(
    (row) => row.title === MULTI_DAY
  );
  expectSeededToday(
    MULTI_DAY,
    multiDay?.scheduled_date ? addDays(multiDay.scheduled_date, -1) : null,
    user
  );
  snapshot = await SeedSnapshot.take(harvey, user, [personalId, workId]);
});

test.afterEach(async () => {
  try {
    await snapshot.restore();
    await expectUnchanged(snapshot);
  } finally {
    await restoreSeedAccount(harvey.email);
  }
});

test('places the seeded spanning bars at their start and length in the week', async ({
  page,
}) => {
  const week = weekOf(todayFor(user));
  const spans = await openSpans(personalId);
  expect(spans.map((span) => span.title)).toEqual(
    expect.arrayContaining([
      'Timeline fixture - Starts before week',
      'Timeline fixture - Ends after week',
    ])
  );

  await logIn(page, harvey.email, harvey.password);
  await openTimeline(page, personalId, week);
  await expect(
    page.locator('app-timeline-header .zoom-option', { hasText: 'Week' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expectBarsPlaced(page, spans, week);

  // The overdue fixture uses the overdue style wherever it shows.
  const overdue = bar(page, 'Timeline fixture - Overdue');
  if (await overdue.isVisible())
    await expect(overdue.locator('.bar')).toHaveClass(/\boverdue\b/);

  // Undated tasks have no bar; the page counts them instead.
  await expect(bar(page, 'Timeline fixture - Undated')).toHaveCount(0);
  await expect(page.locator('app-timeline-view .undated')).toContainText(
    '1 undated task not shown.'
  );
});

test('switches to the month and places the same bars there', async ({
  page,
}) => {
  const today = todayFor(user);
  const month = monthOf(today);
  const spans = await openSpans(personalId);

  await logIn(page, harvey.email, harvey.password);
  await openTimeline(page, personalId, weekOf(today));

  const loaded = apiResponse(page, 'GET', /\/api\/tasks\/timeline$/);
  await page
    .locator('app-timeline-header .zoom-option', { hasText: 'Month' })
    .click();
  const url = new URL((await loaded).url());
  expect({
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  }).toEqual(month);

  const [year, monthNumber] = today.split('-').map(Number);
  await expect(page.locator('app-timeline-header .range')).toHaveText(
    `${MONTHS[monthNumber - 1]} ${year}`
  );
  await expect(
    page.locator('app-timeline-header .zoom-option', { hasText: 'Month' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expectBarsPlaced(page, spans, month);
});

test('opens a task by clicking its bar', async ({ page }) => {
  const week = weekOf(todayFor(user));
  const spans = await openSpans(workId);
  const crosses = (window: Window) =>
    spans.find((span) => span.start <= window.to && span.end >= window.from);
  // Multi-day starts tomorrow, so on a Sunday the Work tasks are all in next week.
  const nextWeek = weekOf(addDays(week.from, 7));
  const target = crosses(week) ?? crosses(nextWeek);
  expect(target, 'a Work task crosses this week or the next').toBeTruthy();

  await logIn(page, harvey.email, harvey.password);
  await openTimeline(page, workId, week);
  if (!crosses(week)) {
    const loaded = apiResponse(page, 'GET', /\/api\/tasks\/timeline$/);
    await page.getByRole('button', { name: 'Next week', exact: true }).click();
    await loaded;
  }

  await bar(page, target!.title).locator('button.title').click();
  const dialog = page.locator('app-new-task-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#task-title')).toHaveValue(target!.title);
});
