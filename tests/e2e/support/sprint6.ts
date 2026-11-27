import { expect, type Locator, type Page } from '@playwright/test';
import { addDays, localDate } from './dashboard';
import {
  deleteServiceRoleRows,
  deleteTaskRows,
  patchTaskRow,
  profileForUser,
  serviceRoleRows,
} from './database';
import { apiToken, restoreSeededProjects, seededProjects } from './projects';
import { seedAccounts } from './seed-data';

/**
 * Shared helpers for the Sprint 6 specs (streaks, reordering and the four task views).
 *
 * Their fixtures come from supabase/seeds/011_task_positions.sql to 014_board_status.sql. The
 * streak and timeline fixtures are dated relative to the day the seed ran, so the specs that use
 * them first check that the seed ran today. Every task row, completion and project order a test
 * changes is put back in afterEach, and the test fails if the seeded rows differ afterwards.
 */

export type SeedAccount = (typeof seedAccounts)[number];
export const [james, harvey] = seedAccounts;

export type SeedUser = { userId: string; timeZone: string };

export async function seedUser(account: SeedAccount): Promise<SeedUser> {
  const profile = await profileForUser(account.email);
  return { userId: profile.user_id, timeZone: profile.timezone ?? 'UTC' };
}

/** Today in the user's timezone, the day the API and the page work from. */
export function todayFor(user: SeedUser): string {
  return localDate(new Date(), user.timeZone);
}

export { addDays };

/** The project's id, or a clear error when the seed that adds it has not run. */
export async function seededProjectId(
  user: SeedUser,
  name: string,
  seedFile: string
): Promise<number> {
  const rows = await serviceRoleRows<{ project_id: number }>(
    'tbl_project',
    new URLSearchParams({
      select: 'project_id',
      user_id: `eq.${user.userId}`,
      name: `eq.${name}`,
      deleted_at: 'is.null',
    })
  );
  if (rows.length !== 1) {
    throw new Error(
      `Seed project "${name}" is missing; run npm run supabase:local:seed (${seedFile})`
    );
  }
  return rows[0].project_id;
}

/**
 * Stops a date-based spec with a clear message unless its fixtures were seeded today. `seedDay`
 * is the day the seed ran, read back from a fixture whose dates are relative to it.
 */
export function expectSeededToday(
  fixture: string,
  seedDay: string | null,
  user: SeedUser
): void {
  const today = todayFor(user);
  if (seedDay === today) return;
  throw new Error(
    seedDay === null
      ? `Seed fixture "${fixture}" is missing; reset and seed the local database: ` +
          'npm run supabase:local:reset && npm run supabase:local:seed'
      : `The Sprint 6 seed is more than one day old: "${fixture}" was seeded for ${seedDay}, ` +
          `but today is ${today} (${user.timeZone}). Its dates are relative to the day the seed ` +
          'ran, so reset and seed the local database today: ' +
          'npm run supabase:local:reset && npm run supabase:local:seed'
  );
}

export type TaskRow = {
  task_id: number;
  project_id: number | null;
  title: string;
  position: number;
  scheduled_date: string | null;
  due_date: string | null;
  deadline: string | null;
  is_done: boolean;
  done_at: string | null;
  board_status: string;
  archived_at: string | null;
  deleted_at: string | null;
};

const taskColumns =
  'task_id,project_id,title,position,scheduled_date,due_date,deadline,is_done,done_at,board_status,archived_at,deleted_at';

/** Every task row of the projects, deleted and archived ones included, by id. */
export async function projectTaskRows(
  user: SeedUser,
  projectIds: number[]
): Promise<TaskRow[]> {
  return serviceRoleRows<TaskRow>(
    'tbl_task',
    new URLSearchParams({
      select: taskColumns,
      user_id: `eq.${user.userId}`,
      project_id: `in.(${projectIds.join(',')})`,
      order: 'task_id.asc',
    })
  );
}

/** The project's active (not archived or deleted) tasks, by id. */
export async function activeTasks(
  user: SeedUser,
  projectId: number
): Promise<TaskRow[]> {
  return (await projectTaskRows(user, [projectId])).filter(
    (row) => row.archived_at === null && row.deleted_at === null
  );
}

type CompletionRow = {
  completion_id: number;
  task_id: number;
  series_id: string | null;
  completed_on: string;
};

async function completionRows(user: SeedUser): Promise<CompletionRow[]> {
  return serviceRoleRows<CompletionRow>(
    'tbl_task_completion',
    new URLSearchParams({
      select: 'completion_id,task_id,series_id,completed_on',
      user_id: `eq.${user.userId}`,
      order: 'completion_id.asc',
    })
  );
}

/**
 * The seeded state of some projects: their task rows, the user's completion history and the
 * user's project order. restore() deletes rows a test added (next occurrences, completions) and
 * writes changed rows back; state() is compared before and after.
 */
export class SeedSnapshot {
  private constructor(
    private readonly user: SeedUser,
    private readonly account: SeedAccount,
    private readonly projectIds: number[],
    private readonly tasks: TaskRow[],
    private readonly completions: CompletionRow[],
    private readonly projects: Awaited<ReturnType<typeof seededProjects>>
  ) {}

  static async take(
    account: SeedAccount,
    user: SeedUser,
    projectIds: number[]
  ): Promise<SeedSnapshot> {
    return new SeedSnapshot(
      user,
      account,
      projectIds,
      await projectTaskRows(user, projectIds),
      await completionRows(user),
      await seededProjects(user.userId)
    );
  }

  async state() {
    return {
      tasks: await projectTaskRows(this.user, this.projectIds),
      completions: await completionRows(this.user),
      projects: await seededProjects(this.user.userId),
    };
  }

  expected() {
    return {
      tasks: this.tasks,
      completions: this.completions,
      projects: this.projects,
    };
  }

  async restore(): Promise<void> {
    const seededIds = new Set(this.tasks.map((row) => row.task_id));
    const now = await projectTaskRows(this.user, this.projectIds);
    const keptCompletions = new Set(
      this.completions.map((row) => row.completion_id)
    );
    const extraCompletions = (await completionRows(this.user)).filter(
      (row) => !keptCompletions.has(row.completion_id)
    );
    if (extraCompletions.length) {
      await deleteServiceRoleRows(
        'tbl_task_completion',
        new URLSearchParams({
          completion_id: `in.(${extraCompletions.map((row) => row.completion_id).join(',')})`,
        })
      );
    }
    await deleteTaskRows(
      this.user.userId,
      now.filter((row) => !seededIds.has(row.task_id)).map((row) => row.task_id)
    );
    for (const seeded of this.tasks) {
      const current = now.find((row) => row.task_id === seeded.task_id);
      if (current && JSON.stringify(current) === JSON.stringify(seeded))
        continue;
      const { task_id, ...values } = seeded;
      await patchTaskRow(task_id, values);
    }
    if (
      JSON.stringify(await seededProjects(this.user.userId)) !==
      JSON.stringify(this.projects)
    ) {
      await restoreSeededProjects(await apiToken(this.account), this.projects);
    }
  }
}

/** Resolves with the first response to `method` on a path matching `path`. */
export function apiResponse(page: Page, method: string, path: RegExp) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      path.test(new URL(response.url()).pathname)
  );
}

/**
 * Drags `source` (a CDK drag handle or item) onto `target`, the way a mouse does: press, a few
 * small moves to pass CDK's drag threshold, a slow move to the target, then release. `offsetY`
 * picks where on the target to drop: a small value drops before it.
 */
export async function dragTo(
  page: Page,
  source: Locator,
  target: Locator,
  offsetY = 4
): Promise<void> {
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 8, { steps: 4 });
  const to = (await target.boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + offsetY, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, to.y + offsetY + 1, { steps: 2 });
  await page.mouse.up();
}

/** Texts of the elements, trimmed, in page order. */
export async function textsOf(locator: Locator): Promise<string[]> {
  return (await locator.allTextContents()).map((text) =>
    text.trim().replace(/\s+/g, ' ')
  );
}

/** "Nov 28": the month and day, as the app's date labels start. */
export function monthDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export async function expectUnchanged(snapshot: SeedSnapshot): Promise<void> {
  expect(await snapshot.state()).toEqual(snapshot.expected());
}
