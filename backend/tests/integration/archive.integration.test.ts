import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  defaultPriorityIdFor,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('archive integration', () => {
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

  async function apiRequest(
    method: string,
    path: string,
    token?: string,
    body?: unknown
  ): Promise<TestResponse> {
    return request(app, path, {
      method,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body }),
    });
  }

  async function seedProject(
    userId: string,
    values: {
      name: string;
      isInbox?: boolean;
      isArchived?: boolean;
      archivedAt?: Date | null;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.project.create({
      data: {
        userId,
        name: values.name,
        isInbox: values.isInbox,
        isArchived: values.isArchived,
        archivedAt:
          values.archivedAt !== undefined
            ? values.archivedAt
            : values.isArchived
              ? new Date()
              : null,
        deletedAt: values.deletedAt,
      },
    });
  }

  async function seedTask(
    userId: string,
    projectId: number,
    values: {
      title: string;
      dueDate?: Date | null;
      isDone?: boolean;
      recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
      archivedAt?: Date | null;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.task.create({
      data: {
        userId,
        projectId,
        priorityId: await defaultPriorityIdFor(userId),
        title: values.title,
        dueDate: values.dueDate,
        isDone: values.isDone,
        boardStatus: values.isDone ? 'done' : 'todo',
        recurrence: values.recurrence,
        archivedAt: values.archivedAt,
        deletedAt: values.deletedAt,
      },
    });
  }

  async function seedLabel(
    userId: string,
    name: string,
    archivedAt: Date | null = null
  ) {
    return prisma.label.create({
      data: { userId, name, archivedAt },
    });
  }

  function ids(body: unknown): number[] {
    if (!Array.isArray(body)) {
      throw new Error('Expected list response to be an array');
    }
    return body.map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('id' in item) ||
        typeof item.id !== 'number'
      ) {
        throw new Error('Expected every list item to include a numeric id');
      }
      return item.id;
    });
  }

  function dashboardTaskIds(body: unknown): number[] {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('tasks' in body) ||
      !Array.isArray(body.tasks)
    ) {
      throw new Error('Expected dashboard response to include tasks');
    }
    return ids(body.tasks);
  }

  function archiveEntries(body: unknown): ArchiveEntry[] {
    if (typeof body !== 'object' || body === null) {
      throw new Error('Expected archive response to be an object');
    }
    const response = body as Record<string, unknown>;
    const entries: ArchiveEntry[] = [];
    for (const type of ['tasks', 'projects', 'labels'] as const) {
      const group = response[type];
      if (
        typeof group !== 'object' ||
        group === null ||
        !('items' in group) ||
        !Array.isArray(group.items)
      ) {
        throw new Error(`Expected archive response to include ${type} items`);
      }
      for (const item of group.items) {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('id' in item) ||
          typeof item.id !== 'number' ||
          !('archivedAt' in item) ||
          typeof item.archivedAt !== 'string'
        ) {
          throw new Error(
            `Expected each ${type} archive item to have an id and archivedAt`
          );
        }
        entries.push({ type, id: item.id, archivedAt: item.archivedAt });
      }
    }
    return entries;
  }

  function addCalendarDays(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days))
      .toISOString()
      .slice(0, 10);
  }

  function localToday(timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((item) => item.type === type)!.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  it('archives and restores tasks, labels, and projects idempotently', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archive lifecycle',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'Archive lifecycle task',
    });
    const label = await seedLabel(account.id, 'Archive lifecycle label');

    const taskPath = `/api/tasks/${task.id}/archive`;
    const taskArchive = await apiRequest('PUT', taskPath, account.token, {
      isArchived: true,
    });
    expect(taskArchive.status).toBe(200);
    expect(taskArchive.body).toMatchObject({
      taskId: task.id,
      isArchived: true,
    });
    const taskArchivedAt = taskArchive.body.archivedAt;
    expect(typeof taskArchivedAt).toBe('string');
    const taskArchiveRepeat = await apiRequest('PUT', taskPath, account.token, {
      isArchived: true,
    });
    expect(taskArchiveRepeat.status).toBe(200);
    expect(taskArchiveRepeat.body.archivedAt).toBe(taskArchivedAt);
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .archivedAt
    ).toEqual(new Date(taskArchivedAt));

    const taskRestore = await apiRequest('PUT', taskPath, account.token, {
      isArchived: false,
    });
    const taskRestoreRepeat = await apiRequest('PUT', taskPath, account.token, {
      isArchived: false,
    });
    expect(taskRestore.status).toBe(200);
    expect(taskRestoreRepeat.status).toBe(200);
    expect(taskRestore.body.archivedAt).toBeNull();
    expect(taskRestoreRepeat.body.archivedAt).toBeNull();
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .archivedAt
    ).toBeNull();

    const labelPath = `/api/labels/${label.id}/archive`;
    const labelArchive = await apiRequest('PUT', labelPath, account.token, {
      isArchived: true,
    });
    expect(labelArchive.status).toBe(200);
    expect(labelArchive.body).toMatchObject({
      id: label.id,
      isArchived: true,
    });
    const labelArchivedAt = labelArchive.body.archivedAt;
    const labelArchiveRepeat = await apiRequest(
      'PUT',
      labelPath,
      account.token,
      { isArchived: true }
    );
    expect(labelArchiveRepeat.status).toBe(200);
    expect(labelArchiveRepeat.body.archivedAt).toBe(labelArchivedAt);
    expect(
      (await prisma.label.findUniqueOrThrow({ where: { id: label.id } }))
        .archivedAt
    ).toEqual(new Date(labelArchivedAt));

    const labelRestore = await apiRequest('PUT', labelPath, account.token, {
      isArchived: false,
    });
    const labelRestoreRepeat = await apiRequest(
      'PUT',
      labelPath,
      account.token,
      { isArchived: false }
    );
    expect(labelRestore.status).toBe(200);
    expect(labelRestoreRepeat.status).toBe(200);
    expect(labelRestore.body.archivedAt).toBeNull();
    expect(labelRestoreRepeat.body.archivedAt).toBeNull();
    expect(
      (await prisma.label.findUniqueOrThrow({ where: { id: label.id } }))
        .archivedAt
    ).toBeNull();

    const projectPath = `/api/projects/${project.id}/archive`;
    const projectArchive = await apiRequest('PUT', projectPath, account.token, {
      isArchived: true,
    });
    expect(projectArchive.status).toBe(200);
    expect(projectArchive.body).toMatchObject({
      projectId: project.id,
      isArchived: true,
      message: 'Project archived successfully',
    });
    const projectArchivedAt = projectArchive.body.archivedAt;
    expect(typeof projectArchivedAt).toBe('string');
    const projectArchiveRepeat = await apiRequest(
      'PUT',
      projectPath,
      account.token,
      { isArchived: true }
    );
    expect(projectArchiveRepeat.status).toBe(200);
    expect(projectArchiveRepeat.body.archivedAt).toBe(projectArchivedAt);
    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .archivedAt
    ).toEqual(new Date(projectArchivedAt));

    const projectRestore = await apiRequest('PUT', projectPath, account.token, {
      isArchived: false,
    });
    const projectRestoreRepeat = await apiRequest(
      'PUT',
      projectPath,
      account.token,
      { isArchived: false }
    );
    expect(projectRestore.status).toBe(200);
    expect(projectRestore.body).toMatchObject({
      projectId: project.id,
      isArchived: false,
      archivedAt: null,
      message: 'Project restored from archive',
    });
    expect(projectRestoreRepeat.status).toBe(200);
    expect(projectRestoreRepeat.body.archivedAt).toBeNull();
    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .archivedAt
    ).toBeNull();
  });

  it('keeps archived records out of active lists and dashboards but exposes archived filters', async () => {
    const account = await createAccount();
    const activeProject = await seedProject(account.id, {
      name: 'Visible dashboard project',
    });
    const archivedProject = await seedProject(account.id, {
      name: 'Hidden archived project',
    });
    const today = localToday(account.timezone);
    // Tomorrow's tasks are upcoming; yesterday's have passed their end date and are overdue.
    const dueDate = new Date(`${addCalendarDays(today, 1)}T00:00:00.000Z`);
    const pastDueDate = new Date(`${addCalendarDays(today, -1)}T00:00:00.000Z`);
    const activeTask = await seedTask(account.id, activeProject.id, {
      title: 'Visible dashboard task',
      dueDate,
    });
    const overdueTask = await seedTask(account.id, activeProject.id, {
      title: 'Visible overdue task',
      dueDate: pastDueDate,
    });
    const archivedTask = await seedTask(account.id, activeProject.id, {
      title: 'Archived task',
      dueDate,
    });
    const archivedOverdueTask = await seedTask(account.id, activeProject.id, {
      title: 'Archived overdue task',
      dueDate: pastDueDate,
    });
    const archivedProjectTask = await seedTask(account.id, archivedProject.id, {
      title: 'Task in archived project',
      dueDate,
    });
    const archivedProjectOverdueTask = await seedTask(
      account.id,
      archivedProject.id,
      { title: 'Overdue task in archived project', dueDate: pastDueDate }
    );
    const archivedLabel = await seedLabel(account.id, 'Archived label');
    const activeLabel = await seedLabel(account.id, 'Active label');

    for (const task of [archivedTask, archivedOverdueTask]) {
      expect(
        (
          await apiRequest(
            'PUT',
            `/api/tasks/${task.id}/archive`,
            account.token,
            { isArchived: true }
          )
        ).status
      ).toBe(200);
    }
    expect(
      (
        await apiRequest(
          'PUT',
          `/api/projects/${archivedProject.id}/archive`,
          account.token,
          { isArchived: true }
        )
      ).status
    ).toBe(200);
    expect(
      (
        await apiRequest(
          'PUT',
          `/api/labels/${archivedLabel.id}/archive`,
          account.token,
          { isArchived: true }
        )
      ).status
    ).toBe(200);

    const activeTasks = await apiRequest(
      'GET',
      '/api/tasks?status=all',
      account.token
    );
    expect(activeTasks.status).toBe(200);
    expect(ids(activeTasks.body).sort((a, b) => a - b)).toEqual(
      [activeTask.id, overdueTask.id].sort((a, b) => a - b)
    );
    const archivedTasks = await apiRequest(
      'GET',
      '/api/tasks?status=all&isArchived=true',
      account.token
    );
    expect(archivedTasks.status).toBe(200);
    expect(ids(archivedTasks.body).sort((a, b) => a - b)).toEqual(
      [archivedTask.id, archivedOverdueTask.id].sort((a, b) => a - b)
    );
    expect(archivedTasks.body[0]).toMatchObject({
      isArchived: true,
      archivedAt: expect.any(String),
    });
    expect(ids(archivedTasks.body)).not.toContain(archivedProjectTask.id);
    expect(ids(archivedTasks.body)).not.toContain(
      archivedProjectOverdueTask.id
    );

    const activeLabels = await apiRequest('GET', '/api/labels', account.token);
    expect(activeLabels.status).toBe(200);
    expect(ids(activeLabels.body)).toEqual([activeLabel.id]);
    const archivedLabels = await apiRequest(
      'GET',
      '/api/labels?isArchived=true',
      account.token
    );
    expect(archivedLabels.status).toBe(200);
    expect(ids(archivedLabels.body)).toEqual([archivedLabel.id]);
    expect(archivedLabels.body[0]).toMatchObject({
      isArchived: true,
      archivedAt: expect.any(String),
    });

    const archivedProjects = await apiRequest(
      'GET',
      '/api/projects?isArchived=true',
      account.token
    );
    expect(archivedProjects.status).toBe(200);
    expect(ids(archivedProjects.body)).toEqual([archivedProject.id]);

    const upcoming = await apiRequest(
      'GET',
      '/api/dashboard/current-upcoming-tasks?days=30',
      account.token
    );
    expect(upcoming.status).toBe(200);
    expect(dashboardTaskIds(upcoming.body)).toEqual([activeTask.id]);

    const overdue = await apiRequest(
      'GET',
      '/api/dashboard/overdue-tasks',
      account.token
    );
    expect(overdue.status).toBe(200);
    expect(dashboardTaskIds(overdue.body)).toEqual([overdueTask.id]);
    for (const response of [upcoming, overdue]) {
      for (const hidden of [
        archivedTask,
        archivedOverdueTask,
        archivedProjectTask,
        archivedProjectOverdueTask,
      ]) {
        expect(dashboardTaskIds(response.body)).not.toContain(hidden.id);
      }
    }
  });

  it('groups the Archive list, orders newest first, paginates with cursors, and excludes soft-deleted rows', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archive feed task project',
    });
    const stamp = (day: number) =>
      new Date(`2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`);
    const taskRows = await Promise.all([
      seedTask(account.id, project.id, {
        title: 'Feed task newest',
        archivedAt: stamp(10),
      }),
      seedTask(account.id, project.id, {
        title: 'Feed task middle',
        archivedAt: stamp(8),
      }),
      seedTask(account.id, project.id, {
        title: 'Feed task oldest',
        archivedAt: stamp(6),
      }),
    ]);
    const projectRows = await Promise.all([
      seedProject(account.id, {
        name: 'Feed project middle',
        isArchived: true,
        archivedAt: stamp(9),
      }),
      seedProject(account.id, {
        name: 'Feed project older',
        isArchived: true,
        archivedAt: stamp(5),
      }),
    ]);
    const labelRows = await Promise.all([
      seedLabel(account.id, 'Feed label middle', stamp(7)),
      seedLabel(account.id, 'Feed label oldest', stamp(4)),
    ]);
    const deletedTask = await seedTask(account.id, project.id, {
      title: 'Soft-deleted archived task',
      archivedAt: stamp(11),
      deletedAt: new Date(),
    });
    const deletedProject = await seedProject(account.id, {
      name: 'Soft-deleted archived project',
      isArchived: true,
      archivedAt: stamp(12),
      deletedAt: new Date(),
    });
    const expected = [
      ...taskRows.map((task) => ({
        type: 'tasks' as const,
        id: task.id,
        archivedAt: task.archivedAt!.toISOString(),
      })),
      ...projectRows.map((item) => ({
        type: 'projects' as const,
        id: item.id,
        archivedAt: item.archivedAt!.toISOString(),
      })),
      ...labelRows.map((item) => ({
        type: 'labels' as const,
        id: item.id,
        archivedAt: item.archivedAt!.toISOString(),
      })),
    ].sort(
      (first, second) =>
        new Date(second.archivedAt).getTime() -
        new Date(first.archivedAt).getTime()
    );
    const pages: ArchiveEntry[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 4; page += 1) {
      const query = new URLSearchParams({ limit: '2' });
      if (cursor) query.set('cursor', cursor);
      const response = await apiRequest(
        'GET',
        `/api/archive?${query}`,
        account.token
      );
      expect(response.status).toBe(200);
      expect(response.body.tasks.total).toBe(3);
      expect(response.body.projects.total).toBe(2);
      expect(response.body.labels.total).toBe(2);
      pages.push(...archiveEntries(response.body));
      cursor = response.body.nextCursor;
      if (cursor === null) break;
    }
    expect(cursor).toBeNull();
    pages.sort(
      (first, second) =>
        new Date(second.archivedAt).getTime() -
        new Date(first.archivedAt).getTime()
    );
    expect(pages).toEqual(expected);
    expect(pages.map(({ id }) => id)).not.toContain(deletedTask.id);
    expect(pages.map(({ id }) => id)).not.toContain(deletedProject.id);

    for (const type of ['tasks', 'projects', 'labels'] as const) {
      const response = await apiRequest(
        'GET',
        `/api/archive?type=${type}&limit=1`,
        account.token
      );
      expect(response.status).toBe(200);
      expect(response.body[type].items).toHaveLength(1);
      expect(response.body[type].total).toBe(
        type === 'tasks' ? 3 : type === 'projects' ? 2 : 2
      );
      for (const otherType of ['tasks', 'projects', 'labels'] as const) {
        if (otherType !== type) {
          expect(response.body[otherType].items).toEqual([]);
          expect(response.body[otherType].total).toBe(0);
        }
      }
    }

    const firstTaskPage = await apiRequest(
      'GET',
      '/api/archive?type=tasks&limit=1',
      account.token
    );
    expect(firstTaskPage.body.nextCursor).toEqual(expect.any(String));
    const secondTaskPage = await apiRequest(
      'GET',
      `/api/archive?type=tasks&limit=1&cursor=${encodeURIComponent(firstTaskPage.body.nextCursor)}`,
      account.token
    );
    expect(secondTaskPage.status).toBe(200);
    expect(ids(secondTaskPage.body.tasks.items)).toEqual([taskRows[1].id]);
  });

  it('blocks editing, rescheduling, relabelling, and completion of archived tasks but allows deletion', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archived task read-only project',
    });
    const label = await seedLabel(account.id, 'Active relabel target');
    const task = await seedTask(account.id, project.id, {
      title: 'Read-only archived task',
      dueDate: new Date('2026-11-25T00:00:00.000Z'),
      recurrence: 'daily',
    });
    const archive = await apiRequest(
      'PUT',
      `/api/tasks/${task.id}/archive`,
      account.token,
      { isArchived: true }
    );
    expect(archive.status).toBe(200);
    const original = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    });
    const operations = [
      apiRequest('PUT', `/api/tasks/${task.id}`, account.token, {
        title: 'Should not change',
      }),
      apiRequest('PUT', `/api/tasks/${task.id}/due-date`, account.token, {
        dueDate: '2026-11-26',
      }),
      apiRequest('POST', `/api/tasks/${task.id}/labels`, account.token, {
        labelIds: [label.id],
      }),
      apiRequest('PUT', `/api/tasks/${task.id}`, account.token, {
        isDone: true,
      }),
    ];
    const responses = await Promise.all(operations);
    expect(responses.map(({ status }) => status)).toEqual([409, 409, 409, 409]);
    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: task.id } })
    ).toEqual(original);
    expect(await prisma.taskLabel.count({ where: { taskId: task.id } })).toBe(
      0
    );
    expect(
      await prisma.taskCompletionEvent.count({ where: { taskId: task.id } })
    ).toBe(0);

    const deleted = await apiRequest(
      'DELETE',
      `/api/tasks/${task.id}`,
      account.token
    );
    expect(deleted.status).toBe(200);
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .deletedAt
    ).toBeInstanceOf(Date);
  });

  it('rejects adding an archived label while preserving an existing task-label link', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archived label project',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'Task retains archived label',
    });
    const label = await seedLabel(account.id, 'Label attached before archive');
    await prisma.taskLabel.create({
      data: { taskId: task.id, labelId: label.id },
    });

    const archive = await apiRequest(
      'PUT',
      `/api/labels/${label.id}/archive`,
      account.token,
      { isArchived: true }
    );
    expect(archive.status).toBe(200);
    const attach = await apiRequest(
      'POST',
      `/api/tasks/${task.id}/labels`,
      account.token,
      { labelIds: [label.id] }
    );
    expect(attach.status).toBe(409);
    expect(
      await prisma.taskLabel.findUnique({
        where: { taskId_labelId: { taskId: task.id, labelId: label.id } },
      })
    ).not.toBeNull();
    const taskLabels = await apiRequest(
      'GET',
      `/api/tasks/${task.id}/labels`,
      account.token
    );
    expect(taskLabels.status).toBe(200);
    expect(taskLabels.body).toMatchObject([{ id: label.id, isArchived: true }]);
  });

  it('does not create a next occurrence when a recurring task is archived', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archived recurring project',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'Archived daily recurrence',
      dueDate: new Date('2026-11-25T00:00:00.000Z'),
      recurrence: 'daily',
    });
    const archive = await apiRequest(
      'PUT',
      `/api/tasks/${task.id}/archive`,
      account.token,
      { isArchived: true }
    );
    expect(archive.status).toBe(200);

    const completion = await apiRequest(
      'PUT',
      `/api/tasks/${task.id}`,
      account.token,
      { isDone: true }
    );
    expect(completion.status).toBe(409);
    expect(
      await prisma.task.count({
        where: { userId: account.id, title: task.title, deletedAt: null },
      })
    ).toBe(1);
    expect(
      await prisma.taskCompletionEvent.count({ where: { taskId: task.id } })
    ).toBe(0);
  });

  it('rejects archiving the Inbox through the API and the database constraint', async () => {
    const account = await createAccount();
    const response = await apiRequest(
      'PUT',
      `/api/projects/${account.inboxProjectId}/archive`,
      account.token,
      { isArchived: true }
    );
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Inbox project cannot be archived',
    });

    await expect(
      prisma.project.update({
        where: { id: account.inboxProjectId },
        data: { isArchived: true, archivedAt: new Date() },
      })
    ).rejects.toThrow();
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: account.inboxProjectId },
      })
    ).toMatchObject({ isInbox: true, isArchived: false, archivedAt: null });
  });

  it('returns 404 for another user’s items and never lists them in the Archive', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const otherProject = await seedProject(otherAccount.id, {
      name: 'Foreign archived task project',
    });
    const foreignTask = await seedTask(otherAccount.id, otherProject.id, {
      title: 'Foreign archived task',
      archivedAt: new Date('2026-11-12T12:00:00.000Z'),
    });
    const foreignProjectArchive = await seedProject(otherAccount.id, {
      name: 'Foreign archived project',
      isArchived: true,
      archivedAt: new Date('2026-11-11T12:00:00.000Z'),
    });
    const foreignLabel = await seedLabel(
      otherAccount.id,
      'Foreign archived label',
      new Date('2026-11-10T12:00:00.000Z')
    );

    const taskArchive = await apiRequest(
      'PUT',
      `/api/tasks/${foreignTask.id}/archive`,
      account.token,
      { isArchived: false }
    );
    const projectArchive = await apiRequest(
      'PUT',
      `/api/projects/${foreignProjectArchive.id}/archive`,
      account.token,
      { isArchived: false }
    );
    const labelArchive = await apiRequest(
      'PUT',
      `/api/labels/${foreignLabel.id}/archive`,
      account.token,
      { isArchived: false }
    );
    expect(taskArchive.status).toBe(404);
    expect(projectArchive.status).toBe(404);
    expect(labelArchive.status).toBe(404);

    const archive = await apiRequest('GET', '/api/archive', account.token);
    expect(archive.status).toBe(200);
    expect(archiveEntries(archive.body)).toEqual([]);
    expect(archive.body.tasks.total).toBe(0);
    expect(archive.body.projects.total).toBe(0);
    expect(archive.body.labels.total).toBe(0);
  });

  it('validates archive bodies and queries and requires authentication', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Archive validation project',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'Archive validation task',
    });
    const label = await seedLabel(account.id, 'Archive validation label');
    const routes = [
      `/api/tasks/${task.id}/archive`,
      `/api/projects/${project.id}/archive`,
      `/api/labels/${label.id}/archive`,
    ];

    for (const route of routes) {
      for (const body of [{}, { isArchived: 'true' }]) {
        const response = await apiRequest('PUT', route, account.token, body);
        expect(response.status).toBe(400);
      }
    }

    for (const path of [
      '/api/archive?type=unknown',
      '/api/archive?limit=0',
      '/api/archive?cursor=not-a-valid-cursor',
      '/api/tasks?isArchived=unknown',
      '/api/labels?isArchived=unknown',
    ]) {
      const response = await apiRequest('GET', path, account.token);
      expect(response.status).toBe(400);
    }

    const unauthenticatedRoutes = [
      ['PUT', routes[0], { isArchived: true }],
      ['PUT', routes[1], { isArchived: true }],
      ['PUT', routes[2], { isArchived: true }],
      ['GET', '/api/archive', undefined],
      ['GET', '/api/tasks', undefined],
      ['GET', '/api/labels', undefined],
      ['GET', '/api/dashboard/current-upcoming-tasks', undefined],
      ['GET', '/api/dashboard/overdue-tasks', undefined],
    ] as const;
    for (const [method, path, body] of unauthenticatedRoutes) {
      const response = await apiRequest(method, path, undefined, body);
      expect(response.status).toBe(401);
    }
  });
});

type ArchiveEntry = {
  type: 'tasks' | 'projects' | 'labels';
  id: number;
  archivedAt: string;
};
