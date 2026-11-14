import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;
const currentUpcomingPath = '/api/dashboard/current-upcoming-tasks';
const defaultDays = 7;
const maximumDays = 30;

integrationDescribe('dashboard integration', () => {
  let app: Express;
  let prisma: typeof import('../../src/shared/db/prisma.client').prisma;
  let mediumPriorityId: number;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
    const mediumPriority = await prisma.priorityLevel.findUniqueOrThrow({
      where: { name: 'medium' },
      select: { id: true },
    });
    mediumPriorityId = mediumPriority.id;
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (testSupabase) {
      await deleteIntegrationAccounts(testSupabase);
    }
  });

  async function createAccount(): Promise<IntegrationAccount> {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    return loginAs(app, testSupabase);
  }

  async function dashboardRequest(
    path: string,
    token?: string
  ): Promise<TestResponse> {
    return request(app, path, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
  }

  async function seedProject(userId: string, name: string, isArchived = false) {
    return prisma.project.create({
      data: {
        userId,
        name,
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });
  }

  async function seedTask(
    userId: string,
    projectId: number,
    values: {
      title: string;
      dueDate?: Date | null;
      deadline?: Date | null;
      isDone?: boolean;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.task.create({
      data: {
        userId,
        projectId,
        priorityId: mediumPriorityId,
        title: values.title,
        dueDate: values.dueDate,
        deadline: values.deadline,
        isDone: values.isDone,
        deletedAt: values.deletedAt,
      },
    });
  }

  function taskIds(body: unknown): number[] {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('tasks' in body) ||
      !Array.isArray(body.tasks)
    ) {
      throw new Error('Expected dashboard response to include a tasks array');
    }
    return body.tasks.map((task: unknown) => {
      if (
        typeof task !== 'object' ||
        task === null ||
        !('id' in task) ||
        typeof task.id !== 'number'
      ) {
        throw new Error('Expected dashboard task to include a numeric id');
      }
      return task.id;
    });
  }

  it('returns due tasks from today through the default window end only', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Current and upcoming');
    const today = dateInTimezone(new Date(), account.timezone);
    const dueToday = await seedTask(account.id, project.id, {
      title: 'Due today',
      dueDate: dateOnly(today),
    });
    const dueTomorrow = await seedTask(account.id, project.id, {
      title: 'Due tomorrow',
      dueDate: dateOnly(addDays(today, 1)),
    });
    const dueLastDay = await seedTask(account.id, project.id, {
      title: 'Due on default window end',
      dueDate: dateOnly(addDays(today, defaultDays)),
    });
    const dueAfterWindow = await seedTask(account.id, project.id, {
      title: 'Due after default window',
      dueDate: dateOnly(addDays(today, defaultDays + 1)),
    });
    const pastDue = await seedTask(account.id, project.id, {
      title: 'Past due',
      dueDate: dateOnly(addDays(today, -1)),
    });
    const noDueDate = await seedTask(account.id, project.id, {
      title: 'No due date',
      dueDate: null,
    });

    const response = await dashboardRequest(currentUpcomingPath, account.token);

    expect(response.status).toBe(200);
    expect(taskIds(response.body).sort((a, b) => a - b)).toEqual(
      [dueToday.id, dueTomorrow.id, dueLastDay.id].sort((a, b) => a - b)
    );
    expect(taskIds(response.body)).not.toContain(dueAfterWindow.id);
    expect(taskIds(response.body)).not.toContain(pastDue.id);
    expect(taskIds(response.body)).not.toContain(noDueDate.id);
  });

  it('accepts the maximum window and includes its final day but not the following day', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Maximum dashboard window');
    const today = dateInTimezone(new Date(), account.timezone);
    const finalDay = await seedTask(account.id, project.id, {
      title: 'Due on maximum window end',
      dueDate: dateOnly(addDays(today, maximumDays)),
    });
    const dayAfterFinal = await seedTask(account.id, project.id, {
      title: 'Due after maximum window',
      dueDate: dateOnly(addDays(today, maximumDays + 1)),
    });

    const response = await dashboardRequest(
      `${currentUpcomingPath}?days=${maximumDays}`,
      account.token
    );

    expect(response.status).toBe(200);
    expect(taskIds(response.body)).toContain(finalDay.id);
    expect(taskIds(response.body)).not.toContain(dayAfterFinal.id);
  });

  it('excludes completed, archived-project, and soft-deleted tasks', async () => {
    const account = await createAccount();
    const activeProject = await seedProject(
      account.id,
      'Active dashboard project'
    );
    const archivedProject = await seedProject(
      account.id,
      'Archived dashboard project',
      true
    );
    const today = dateInTimezone(new Date(), account.timezone);
    const visible = await seedTask(account.id, activeProject.id, {
      title: 'Visible task',
      dueDate: dateOnly(addDays(today, 1)),
    });
    const completed = await seedTask(account.id, activeProject.id, {
      title: 'Completed task',
      dueDate: dateOnly(addDays(today, 1)),
      isDone: true,
    });
    const archived = await seedTask(account.id, archivedProject.id, {
      title: 'Archived project task',
      dueDate: dateOnly(addDays(today, 1)),
    });
    const deleted = await seedTask(account.id, activeProject.id, {
      title: 'Soft-deleted task',
      dueDate: dateOnly(addDays(today, 1)),
      deletedAt: new Date(),
    });

    const response = await dashboardRequest(currentUpcomingPath, account.token);

    expect(response.status).toBe(200);
    expect(taskIds(response.body)).toEqual([visible.id]);
    expect(taskIds(response.body)).not.toContain(completed.id);
    expect(taskIds(response.body)).not.toContain(archived.id);
    expect(taskIds(response.body)).not.toContain(deleted.id);
  });

  it('returns only the authenticated user’s tasks', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const accountProject = await seedProject(
      account.id,
      'Owner dashboard tasks'
    );
    const otherProject = await seedProject(
      otherAccount.id,
      'Other user dashboard tasks'
    );
    const today = dateInTimezone(new Date(), account.timezone);
    const ownTask = await seedTask(account.id, accountProject.id, {
      title: 'Own upcoming task',
      dueDate: dateOnly(addDays(today, 1)),
    });
    const foreignTask = await seedTask(otherAccount.id, otherProject.id, {
      title: 'Foreign upcoming task',
      dueDate: dateOnly(addDays(today, 1)),
    });

    const response = await dashboardRequest(currentUpcomingPath, account.token);

    expect(response.status).toBe(200);
    expect(taskIds(response.body)).toEqual([ownTask.id]);
    expect(taskIds(response.body)).not.toContain(foreignTask.id);
  });

  it('uses each user’s local calendar window for the same date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const referenceInstant = nextUtcAt2330(new Date());
    vi.setSystemTime(referenceInstant);

    const manila = await createAccount();
    const honolulu = await createAccount();
    const manilaToday = dateInTimezone(referenceInstant, 'Asia/Manila');
    const honoluluToday = dateInTimezone(referenceInstant, 'Pacific/Honolulu');
    expect(manilaToday).not.toBe(honoluluToday);
    await Promise.all([
      prisma.user.update({
        where: { id: manila.id },
        data: { timezone: 'Asia/Manila' },
      }),
      prisma.user.update({
        where: { id: honolulu.id },
        data: { timezone: 'Pacific/Honolulu' },
      }),
    ]);

    const manilaProject = await seedProject(manila.id, 'Manila timezone tasks');
    const honoluluProject = await seedProject(
      honolulu.id,
      'Honolulu timezone tasks'
    );
    const sameDueDate = dateOnly(manilaToday);
    expect(manilaToday).toBe(addDays(honoluluToday, 1));
    const manilaTodayTask = await seedTask(manila.id, manilaProject.id, {
      title: 'Due today in Manila',
      dueDate: sameDueDate,
    });
    const honoluluTomorrowTask = await seedTask(
      honolulu.id,
      honoluluProject.id,
      {
        title: 'Same date is tomorrow in Honolulu',
        dueDate: sameDueDate,
      }
    );
    const manilaLastDay = await seedTask(manila.id, manilaProject.id, {
      title: 'Manila window boundary',
      dueDate: dateOnly(addDays(manilaToday, 1)),
    });
    const honoluluOutsideWindow = await seedTask(
      honolulu.id,
      honoluluProject.id,
      {
        title: 'Outside Honolulu window',
        dueDate: dateOnly(addDays(manilaToday, 1)),
      }
    );

    const [manilaResponse, honoluluResponse] = await Promise.all([
      dashboardRequest(`${currentUpcomingPath}?days=1`, manila.token),
      dashboardRequest(`${currentUpcomingPath}?days=1`, honolulu.token),
    ]);

    expect(manilaResponse.status).toBe(200);
    expect(honoluluResponse.status).toBe(200);
    expect(taskIds(manilaResponse.body)).toContain(manilaTodayTask.id);
    expect(taskIds(honoluluResponse.body)).toContain(honoluluTomorrowTask.id);
    expect(taskIds(manilaResponse.body)).toContain(manilaLastDay.id);
    expect(taskIds(honoluluResponse.body)).not.toContain(
      honoluluOutsideWindow.id
    );
  });

  it('returns the documented empty result shape when the user has no tasks', async () => {
    const account = await createAccount();

    const response = await dashboardRequest(currentUpcomingPath, account.token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ tasks: [] });
  });

  it('validates days as a positive integer no greater than the maximum', async () => {
    const account = await createAccount();

    for (const days of ['0', '-1', String(maximumDays + 1), 'not-a-number']) {
      const response = await dashboardRequest(
        `${currentUpcomingPath}?days=${encodeURIComponent(days)}`,
        account.token
      );
      expect(response.status).toBe(400);
    }
  });

  it('requires authentication', async () => {
    const response = await dashboardRequest(currentUpcomingPath);

    expect(response.status).toBe(401);
  });

  describe('Overdue Tasks', () => {
    const overduePath = '/api/dashboard/overdue-tasks';

    it('returns deadlines earlier than now, including earlier today, but not later today or future', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const now = new Date('2026-03-10T12:00:00.000Z');
      vi.setSystemTime(now);

      const account = await createAccount();
      const project = await seedProject(
        account.id,
        'Overdue deadline boundaries'
      );
      const earlierToday = await seedTask(account.id, project.id, {
        title: 'Earlier today',
        deadline: new Date('2026-03-10T08:00:00.000Z'),
      });
      const yesterday = await seedTask(account.id, project.id, {
        title: 'Yesterday',
        deadline: new Date('2026-03-09T23:59:59.999Z'),
      });
      const laterToday = await seedTask(account.id, project.id, {
        title: 'Later today',
        deadline: new Date('2026-03-10T12:00:00.001Z'),
      });
      const future = await seedTask(account.id, project.id, {
        title: 'Future',
        deadline: new Date('2026-03-11T00:00:00.000Z'),
      });

      const response = await dashboardRequest(overduePath, account.token);

      expect(response.status).toBe(200);
      expect(taskIds(response.body).sort((a, b) => a - b)).toEqual(
        [earlierToday.id, yesterday.id].sort((a, b) => a - b)
      );
      expect(taskIds(response.body)).not.toContain(laterToday.id);
      expect(taskIds(response.body)).not.toContain(future.id);
    });

    it('orders overdue tasks by oldest deadline first', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));

      const account = await createAccount();
      const project = await seedProject(account.id, 'Overdue ordering');
      const newest = await seedTask(account.id, project.id, {
        title: 'Newest overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
      });
      const oldest = await seedTask(account.id, project.id, {
        title: 'Oldest overdue',
        deadline: new Date('2026-03-08T11:00:00.000Z'),
      });
      const middle = await seedTask(account.id, project.id, {
        title: 'Middle overdue',
        deadline: new Date('2026-03-09T11:00:00.000Z'),
      });

      const response = await dashboardRequest(overduePath, account.token);

      expect(response.status).toBe(200);
      expect(taskIds(response.body)).toEqual([oldest.id, middle.id, newest.id]);
    });

    it('excludes completed, archived-project, soft-deleted, and no-deadline tasks', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));

      const account = await createAccount();
      const activeProject = await seedProject(
        account.id,
        'Active overdue project'
      );
      const archivedProject = await seedProject(
        account.id,
        'Archived overdue project',
        true
      );
      const visible = await seedTask(account.id, activeProject.id, {
        title: 'Visible overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
      });
      const completed = await seedTask(account.id, activeProject.id, {
        title: 'Completed overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
        isDone: true,
      });
      const archived = await seedTask(account.id, archivedProject.id, {
        title: 'Archived project overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
      });
      const deleted = await seedTask(account.id, activeProject.id, {
        title: 'Deleted overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
        deletedAt: new Date(),
      });
      const noDeadline = await seedTask(account.id, activeProject.id, {
        title: 'No deadline',
        dueDate: new Date('2026-03-09T00:00:00.000Z'),
      });

      const response = await dashboardRequest(overduePath, account.token);

      expect(response.status).toBe(200);
      expect(taskIds(response.body)).toEqual([visible.id]);
      expect(taskIds(response.body)).not.toContain(completed.id);
      expect(taskIds(response.body)).not.toContain(archived.id);
      expect(taskIds(response.body)).not.toContain(deleted.id);
      expect(taskIds(response.body)).not.toContain(noDeadline.id);
    });

    it('returns only the caller’s overdue tasks', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));

      const account = await createAccount();
      const otherAccount = await createAccount();
      const project = await seedProject(account.id, 'Owned overdue project');
      const otherProject = await seedProject(
        otherAccount.id,
        'Foreign overdue project'
      );
      const ownTask = await seedTask(account.id, project.id, {
        title: 'Own overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
      });
      const foreignTask = await seedTask(otherAccount.id, otherProject.id, {
        title: 'Foreign overdue',
        deadline: new Date('2026-03-10T11:00:00.000Z'),
      });

      const response = await dashboardRequest(overduePath, account.token);

      expect(response.status).toBe(200);
      expect(taskIds(response.body)).toEqual([ownTask.id]);
      expect(taskIds(response.body)).not.toContain(foreignTask.id);
    });

    it('compares the same deadline instant consistently across timezones', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const now = new Date('2026-03-10T00:30:00.000Z');
      vi.setSystemTime(now);

      const manila = await createAccount();
      const honolulu = await createAccount();
      await Promise.all([
        prisma.user.update({
          where: { id: manila.id },
          data: { timezone: 'Asia/Manila' },
        }),
        prisma.user.update({
          where: { id: honolulu.id },
          data: { timezone: 'Pacific/Honolulu' },
        }),
      ]);

      const deadline = new Date('2026-03-10T01:00:00.000Z');
      expect(dateInTimezone(deadline, 'Asia/Manila')).toBe('2026-03-10');
      expect(dateInTimezone(deadline, 'Pacific/Honolulu')).toBe('2026-03-09');
      const manilaProject = await seedProject(
        manila.id,
        'Manila deadline project'
      );
      const honoluluProject = await seedProject(
        honolulu.id,
        'Honolulu deadline project'
      );
      const manilaTask = await seedTask(manila.id, manilaProject.id, {
        title: 'Later today in Manila',
        deadline,
      });
      const honoluluTask = await seedTask(honolulu.id, honoluluProject.id, {
        title: 'Yesterday in Honolulu',
        deadline,
      });

      const [manilaResponse, honoluluResponse] = await Promise.all([
        dashboardRequest(overduePath, manila.token),
        dashboardRequest(overduePath, honolulu.token),
      ]);

      expect(manilaResponse.status).toBe(200);
      expect(honoluluResponse.status).toBe(200);
      expect(taskIds(manilaResponse.body)).not.toContain(manilaTask.id);
      expect(taskIds(honoluluResponse.body)).not.toContain(honoluluTask.id);
    });

    it('returns an empty tasks array when there is nothing overdue', async () => {
      const account = await createAccount();

      const response = await dashboardRequest(overduePath, account.token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ tasks: [] });
    });

    it('rejects invalid query parameters and requires authentication', async () => {
      const account = await createAccount();

      for (const query of [
        '?days=0',
        '?days=-1',
        '?days=not-a-number',
        '?unexpected=value',
      ]) {
        const response = await dashboardRequest(
          `${overduePath}${query}`,
          account.token
        );
        expect(response.status).toBe(400);
      }

      const unauthorized = await dashboardRequest(overduePath);
      expect(unauthorized.status).toBe(401);
    });
  });
});

function dateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) {
    throw new Error(`Could not determine local date for timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

function dateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function nextUtcAt2330(now: Date): Date {
  const target = new Date(now);
  target.setUTCHours(23, 30, 0, 0);
  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target;
}
