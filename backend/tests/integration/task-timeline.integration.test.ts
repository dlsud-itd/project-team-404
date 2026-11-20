import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type TimelineBar = {
  id: number;
  title: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  start: string;
  end: string;
  isDone: boolean;
  isOverdue: boolean;
  priority: string;
};

type SeedProjectOptions = {
  isArchived?: boolean;
  deletedAt?: Date | null;
};

type SeedTaskOptions = {
  title: string;
  position?: number;
  scheduledDate?: Date | null;
  dueDate?: Date | null;
  deadline?: Date | null;
  isDone?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  priorityId?: number;
  deletedAt?: Date | null;
};

integrationDescribe('task timeline integration', () => {
  let app: Express;
  let prisma: typeof import('../../src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
  });

  afterEach(async () => {
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

  async function timelineRequest(
    query: Record<string, string>,
    token?: string
  ): Promise<TestResponse> {
    return request(app, `/api/tasks/timeline?${new URLSearchParams(query)}`, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
  }

  async function seedProject(
    userId: string,
    name: string,
    options: SeedProjectOptions = {}
  ) {
    return prisma.project.create({
      data: {
        userId,
        name,
        isArchived: options.isArchived ?? false,
        archivedAt: options.isArchived ? new Date() : null,
        deletedAt: options.deletedAt ?? null,
      },
    });
  }

  async function priorityIds(userId: string): Promise<Map<string, number>> {
    const priorities = await prisma.priorityLevel.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true },
    });
    const result = new Map(
      priorities.map(({ id, name }) => [name.toLowerCase(), id])
    );
    if (result.size === 0) {
      throw new Error(
        `No priority levels exist for integration user ${userId}`
      );
    }
    return result;
  }

  async function seedTask(
    account: IntegrationAccount,
    projectId: number,
    values: SeedTaskOptions
  ) {
    const priorities = await priorityIds(account.id);
    const priorityId =
      values.priorityId ??
      priorities.get('medium') ??
      priorities.values().next().value;
    if (priorityId === undefined) {
      throw new Error('No priority level is available for the test task');
    }
    return prisma.task.create({
      data: {
        userId: account.id,
        projectId,
        priorityId,
        position: values.position ?? 0,
        title: values.title,
        scheduledDate: values.scheduledDate,
        dueDate: values.dueDate,
        deadline: values.deadline,
        isDone: values.isDone ?? false,
        boardStatus: values.isDone ? 'done' : 'todo',
        recurrence: values.recurrence ?? 'none',
        deletedAt: values.deletedAt ?? null,
      },
    });
  }

  async function seedTaskLabel(taskId: number, labelId: number): Promise<void> {
    await prisma.taskLabel.create({ data: { taskId, labelId } });
  }

  function localDate(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  function addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function date(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  function deadlineOn(dateValue: string): Date {
    return new Date(`${dateValue}T12:00:00.000Z`);
  }

  function bars(body: unknown): TimelineBar[] {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('projects' in body) ||
      !Array.isArray(body.projects)
    ) {
      throw new Error('Expected timeline response to include project groups');
    }
    return body.projects.flatMap((project: unknown) => {
      if (
        typeof project !== 'object' ||
        project === null ||
        !('bars' in project) ||
        !Array.isArray(project.bars)
      ) {
        throw new Error('Expected timeline project group to include bars');
      }
      return project.bars as TimelineBar[];
    });
  }

  function barByTitle(body: unknown, title: string): TimelineBar {
    const bar = bars(body).find((item) => item.title === title);
    if (!bar) {
      throw new Error(`Expected timeline to include "${title}"`);
    }
    return bar;
  }

  it('builds bars for date fallbacks, clamps earlier deadlines, and uses due-only one-day spans', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline span fallbacks');
    const today = localDate(new Date(), account.timezone);
    const taskSpans = [
      {
        title: 'Scheduled with deadline',
        scheduledDate: date(today),
        deadline: deadlineOn(addDays(today, 3)),
      },
      {
        title: 'Due date only',
        dueDate: date(addDays(today, 1)),
      },
      {
        title: 'Scheduled date only',
        scheduledDate: date(addDays(today, 2)),
      },
      {
        title: 'Scheduled and due without deadline',
        scheduledDate: date(today),
        dueDate: date(addDays(today, 4)),
      },
      {
        title: 'Due date with deadline and no schedule',
        dueDate: date(addDays(today, 1)),
        deadline: deadlineOn(addDays(today, 5)),
      },
      {
        title: 'Deadline before scheduled date',
        scheduledDate: date(addDays(today, 6)),
        deadline: deadlineOn(addDays(today, 5)),
      },
    ];
    await Promise.all(
      taskSpans.map((task, index) =>
        seedTask(account, project.id, { ...task, position: index + 1 })
      )
    );
    const response = await timelineRequest(
      {
        from: addDays(today, -1),
        to: addDays(today, 8),
        projectId: String(project.id),
      },
      account.token
    );

    expect(response.status).toBe(200);
    expect(barByTitle(response.body, 'Scheduled with deadline')).toMatchObject({
      start: today,
      end: addDays(today, 3),
    });
    expect(barByTitle(response.body, 'Due date only')).toMatchObject({
      start: addDays(today, 1),
      end: addDays(today, 1),
    });
    expect(barByTitle(response.body, 'Scheduled date only')).toMatchObject({
      start: addDays(today, 2),
      end: addDays(today, 2),
    });
    expect(
      barByTitle(response.body, 'Scheduled and due without deadline')
    ).toMatchObject({ start: today, end: addDays(today, 4) });
    expect(
      barByTitle(response.body, 'Due date with deadline and no schedule')
    ).toMatchObject({
      start: addDays(today, 1),
      end: addDays(today, 5),
    });
    expect(
      barByTitle(response.body, 'Deadline before scheduled date')
    ).toMatchObject({
      start: addDays(today, 6),
      end: addDays(today, 6),
    });
  });

  it('includes bars crossing either window edge and excludes bars fully outside', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline window overlap');
    const today = localDate(new Date(), account.timezone);
    const from = today;
    const to = addDays(today, 5);
    const leftOverlap = await seedTask(account, project.id, {
      title: 'Crosses left edge',
      scheduledDate: date(addDays(from, -2)),
      deadline: deadlineOn(addDays(from, 1)),
    });
    const rightOverlap = await seedTask(account, project.id, {
      title: 'Crosses right edge',
      scheduledDate: date(addDays(to, -1)),
      deadline: deadlineOn(addDays(to, 2)),
    });
    const beforeWindow = await seedTask(account, project.id, {
      title: 'Before window',
      scheduledDate: date(addDays(from, -4)),
      deadline: deadlineOn(addDays(from, -3)),
    });
    const afterWindow = await seedTask(account, project.id, {
      title: 'After window',
      scheduledDate: date(addDays(to, 1)),
      deadline: deadlineOn(addDays(to, 2)),
    });

    const response = await timelineRequest(
      { from, to, projectId: String(project.id) },
      account.token
    );
    const returnedIds = bars(response.body).map(({ id }) => id);

    expect(response.status).toBe(200);
    expect(returnedIds).toContain(leftOverlap.id);
    expect(returnedIds).toContain(rightOverlap.id);
    expect(returnedIds).not.toContain(beforeWindow.id);
    expect(returnedIds).not.toContain(afterWindow.id);
  });

  it('excludes undated tasks from bars and reports them in undatedCount', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline undated tasks');
    const today = localDate(new Date(), account.timezone);
    const dated = await seedTask(account, project.id, {
      title: 'Dated task',
      dueDate: date(today),
    });
    const undated = await seedTask(account, project.id, {
      title: 'Undated task',
    });
    const deadlineOnly = await seedTask(account, project.id, {
      title: 'Deadline without a start date',
      deadline: deadlineOn(addDays(today, 1)),
    });

    const response = await timelineRequest(
      { from: today, to: addDays(today, 3), projectId: String(project.id) },
      account.token
    );

    expect(response.status).toBe(200);
    expect(bars(response.body).map(({ id }) => id)).toEqual([dated.id]);
    expect(response.body).toMatchObject({ undatedCount: 2 });
    expect(bars(response.body).map(({ id }) => id)).not.toContain(undated.id);
    expect(bars(response.body).map(({ id }) => id)).not.toContain(
      deadlineOnly.id
    );
  });

  it('includes completed tasks only when requested and computes isOverdue correctly', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline completion status');
    const today = localDate(new Date(), account.timezone);
    const overdue = await seedTask(account, project.id, {
      title: 'Overdue open task',
      dueDate: date(addDays(today, -3)),
    });
    const upcoming = await seedTask(account, project.id, {
      title: 'Upcoming open task',
      dueDate: date(addDays(today, 2)),
    });
    const completed = await seedTask(account, project.id, {
      title: 'Completed past task',
      dueDate: date(addDays(today, -4)),
      isDone: true,
    });
    const query = {
      from: addDays(today, -7),
      to: addDays(today, 7),
      projectId: String(project.id),
    };

    const defaultResponse = await timelineRequest(query, account.token);
    const completedResponse = await timelineRequest(
      { ...query, includeCompleted: 'true' },
      account.token
    );

    expect(defaultResponse.status).toBe(200);
    expect(bars(defaultResponse.body).map(({ id }) => id)).toEqual([
      overdue.id,
      upcoming.id,
    ]);
    expect(
      barByTitle(defaultResponse.body, 'Overdue open task').isOverdue
    ).toBe(true);
    expect(
      barByTitle(defaultResponse.body, 'Upcoming open task').isOverdue
    ).toBe(false);
    expect(completedResponse.status).toBe(200);
    expect(bars(completedResponse.body).map(({ id }) => id)).toContain(
      completed.id
    );
    expect(
      barByTitle(completedResponse.body, 'Completed past task')
    ).toMatchObject({ isDone: true, isOverdue: false });
  });

  it('applies project and Sprint 5 filters and excludes archived or deleted data', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline filtered project');
    const anotherProject = await seedProject(
      account.id,
      'Other active timeline project'
    );
    const archivedProject = await seedProject(
      account.id,
      'Archived timeline project',
      { isArchived: true }
    );
    const deletedProject = await seedProject(
      account.id,
      'Deleted timeline project',
      { deletedAt: new Date() }
    );
    const priorities = await priorityIds(account.id);
    const high = priorities.get('high');
    const medium = priorities.get('medium');
    if (high === undefined || medium === undefined) {
      throw new Error('Integration account is missing high or medium priority');
    }
    const dueDate = addDays(localDate(new Date(), account.timezone), 2);
    const label = await prisma.label.create({
      data: { userId: account.id, name: 'Timeline Sprint filter label' },
    });
    const [matching, wrongPriority, notRecurring, outsideRange, deletedTask] =
      await Promise.all([
        seedTask(account, project.id, {
          title: 'Filtered match',
          dueDate: date(dueDate),
          recurrence: 'daily',
          priorityId: high,
        }),
        seedTask(account, project.id, {
          title: 'Filtered wrong priority',
          dueDate: date(dueDate),
          recurrence: 'daily',
          priorityId: medium,
        }),
        seedTask(account, project.id, {
          title: 'Filtered non-recurring',
          dueDate: date(dueDate),
          priorityId: high,
        }),
        seedTask(account, project.id, {
          title: 'Filtered outside due range',
          dueDate: date(addDays(dueDate, 1)),
          recurrence: 'daily',
          priorityId: high,
        }),
        seedTask(account, project.id, {
          title: 'Deleted matching task',
          dueDate: date(dueDate),
          recurrence: 'daily',
          priorityId: high,
          deletedAt: new Date(),
        }),
      ]);
    const matchingOtherProject = await seedTask(account, anotherProject.id, {
      title: 'Matching task in another project',
      dueDate: date(dueDate),
      recurrence: 'daily',
      priorityId: high,
    });
    const archivedTask = await seedTask(account, archivedProject.id, {
      title: 'Matching task in archived project',
      dueDate: date(dueDate),
      recurrence: 'daily',
      priorityId: high,
    });
    const deletedProjectTask = await seedTask(account, deletedProject.id, {
      title: 'Matching task in deleted project',
      dueDate: date(dueDate),
      recurrence: 'daily',
      priorityId: high,
    });
    await Promise.all(
      [
        matching,
        wrongPriority,
        notRecurring,
        outsideRange,
        deletedTask,
        matchingOtherProject,
        archivedTask,
        deletedProjectTask,
      ].map(({ id }) => seedTaskLabel(id, label.id))
    );

    const filters = {
      priority: 'HIGH',
      recurring: 'true',
      labelId: String(label.id),
      dueFrom: dueDate,
      dueTo: dueDate,
    };
    const projectResponse = await timelineRequest(
      {
        ...filters,
        from: addDays(dueDate, -1),
        to: addDays(dueDate, 2),
        projectId: String(project.id),
      },
      account.token
    );
    const allProjectsResponse = await timelineRequest(
      { ...filters, from: addDays(dueDate, -1), to: addDays(dueDate, 2) },
      account.token
    );

    expect(projectResponse.status).toBe(200);
    expect(bars(projectResponse.body).map(({ id }) => id)).toEqual([
      matching.id,
    ]);
    expect(allProjectsResponse.status).toBe(200);
    expect(
      bars(allProjectsResponse.body)
        .map(({ id }) => id)
        .sort((a, b) => a - b)
    ).toEqual([matching.id, matchingOtherProject.id].sort((a, b) => a - b));
    const allIds = bars(allProjectsResponse.body).map(({ id }) => id);
    expect(allIds).not.toContain(archivedTask.id);
    expect(allIds).not.toContain(deletedProjectTask.id);
    expect(allIds).not.toContain(deletedTask.id);
  });

  it('uses the account timezone to convert deadline instants to bar end dates', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Timeline timezone deadline');
    const now = new Date();
    const deadline = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        16,
        30
      )
    );
    if (deadline <= now) deadline.setUTCDate(deadline.getUTCDate() + 1);
    const scheduledDate = deadline.toISOString().slice(0, 10);
    const deadlineLocalDate = localDate(deadline, account.timezone);
    expect(deadlineLocalDate).not.toBe(scheduledDate);
    const task = await seedTask(account, project.id, {
      title: 'Deadline timezone task',
      scheduledDate: date(scheduledDate),
      deadline,
    });

    const response = await timelineRequest(
      {
        from: scheduledDate,
        to: deadlineLocalDate,
        projectId: String(project.id),
      },
      account.token
    );

    expect(response.status).toBe(200);
    expect(barByTitle(response.body, 'Deadline timezone task')).toMatchObject({
      id: task.id,
      start: scheduledDate,
      end: deadlineLocalDate,
    });
  });

  it('never returns another user’s tasks', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const otherProject = await seedProject(otherAccount.id, 'Foreign timeline');
    const dueDate = addDays(localDate(new Date(), account.timezone), 1);
    const foreignTask = await seedTask(otherAccount, otherProject.id, {
      title: 'Private timeline task',
      dueDate: date(dueDate),
    });

    const response = await timelineRequest(
      { from: addDays(dueDate, -1), to: addDays(dueDate, 1) },
      account.token
    );

    expect(response.status).toBe(200);
    expect(bars(response.body).map(({ id }) => id)).not.toContain(
      foreignTask.id
    );
  });

  it('rejects reversed, oversized, and invalid date ranges and requires authentication', async () => {
    const today = localDate(new Date(), 'Asia/Manila');
    const invalidQueries = [
      { from: addDays(today, 1), to: today },
      { from: today, to: addDays(today, 92) },
      { from: '2026-02-30', to: '2026-03-01' },
      { from: 'not-a-date', to: today },
    ];
    const account = await createAccount();
    for (const query of invalidQueries) {
      const response = await timelineRequest(query, account.token);
      expect(response.status).toBe(400);
    }
    const unauthorized = await timelineRequest({
      from: today,
      to: addDays(today, 1),
    });
    expect(unauthorized.status).toBe(401);
  });
});
