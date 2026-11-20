import { randomUUID } from 'node:crypto';
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

type BoardStatus = 'todo' | 'in_progress' | 'done';
type SeedTask = {
  title: string;
  position: number;
  boardStatus?: BoardStatus;
  isDone?: boolean;
  doneAt?: Date | null;
  dueDate?: Date | null;
  scheduledDate?: Date | null;
  deadline?: Date | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceSeriesId?: string | null;
  priorityId?: number;
};
type BoardTask = {
  id: number;
  title: string;
  boardStatus: BoardStatus;
  isDone: boolean;
  position: number;
  doneAt: string | null;
};
type BoardResult = {
  projectId: number;
  columns: {
    todo: BoardTask[];
    inProgress: BoardTask[];
    done: BoardTask[];
  };
  counts: { todo: number; inProgress: number; done: number };
};

integrationDescribe('task board integration', () => {
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

  async function taskRequest(
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

  async function seedProject(userId: string, name: string) {
    return prisma.project.create({ data: { userId, name } });
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

  async function seedTasks(
    account: IntegrationAccount,
    projectId: number,
    values: SeedTask[]
  ) {
    const priorities = await priorityIds(account.id);
    return Promise.all(
      values.map((value) => {
        const boardStatus = value.boardStatus ?? 'todo';
        const isDone = value.isDone ?? boardStatus === 'done';
        const priorityId =
          value.priorityId ??
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
            position: value.position,
            title: value.title,
            boardStatus,
            isDone,
            doneAt:
              value.doneAt !== undefined
                ? value.doneAt
                : isDone
                  ? new Date()
                  : null,
            dueDate: value.dueDate,
            scheduledDate: value.scheduledDate,
            deadline: value.deadline,
            recurrence: value.recurrence ?? 'none',
            recurrenceDays: [],
            recurrenceSeriesId:
              value.recurrenceSeriesId !== undefined
                ? value.recurrenceSeriesId
                : value.recurrence && value.recurrence !== 'none'
                  ? randomUUID()
                  : null,
          },
        });
      })
    );
  }

  async function getBoard(
    projectId: number,
    token: string,
    filters: Record<string, string> = {}
  ): Promise<TestResponse> {
    const query = new URLSearchParams({
      projectId: String(projectId),
      ...filters,
    });
    return taskRequest('GET', `/api/tasks/board?${query}`, token);
  }

  async function reorderColumn(
    projectId: number,
    boardStatus: string,
    tasks: number[],
    token?: string
  ): Promise<TestResponse> {
    return taskRequest('PUT', '/api/tasks/board/reorder', token, {
      projectId,
      boardStatus,
      tasks,
    });
  }

  function boardResult(body: unknown): BoardResult {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('columns' in body) ||
      typeof body.columns !== 'object' ||
      body.columns === null ||
      !('counts' in body) ||
      typeof body.counts !== 'object' ||
      body.counts === null
    ) {
      throw new Error('Expected board response to include columns and counts');
    }
    return body as BoardResult;
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

  async function assertBoardStateConsistent(userId: string): Promise<void> {
    const mismatches = await prisma.task.count({
      where: {
        userId,
        OR: [
          { boardStatus: 'done', isDone: false },
          { boardStatus: { not: 'done' }, isDone: true },
        ],
      },
    });
    expect(mismatches).toBe(0);
  }

  it('lists columns in position order, reports full counts, and caps Done at 50', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board column listing');
    const todoTasks = await seedTasks(account, project.id, [
      { title: 'Todo later', position: 9 },
      { title: 'Todo first', position: 2 },
    ]);
    const inProgressTasks = await seedTasks(account, project.id, [
      { title: 'In progress later', position: 8, boardStatus: 'in_progress' },
      { title: 'In progress first', position: 3, boardStatus: 'in_progress' },
    ]);
    const doneTasks = await seedTasks(
      account,
      project.id,
      Array.from({ length: 52 }, (_, index) => ({
        title: `Done ${index + 1}`,
        position: index + 1,
        boardStatus: 'done' as const,
        doneAt: new Date(Date.now() - (52 - index) * 1000),
      }))
    );

    const response = await getBoard(project.id, account.token);

    expect(response.status).toBe(200);
    const board = boardResult(response.body);
    expect(board.counts).toEqual({ todo: 2, inProgress: 2, done: 52 });
    expect(board.columns.todo.map(({ id }) => id)).toEqual([
      todoTasks[1]!.id,
      todoTasks[0]!.id,
    ]);
    expect(board.columns.inProgress.map(({ id }) => id)).toEqual([
      inProgressTasks[1]!.id,
      inProgressTasks[0]!.id,
    ]);
    expect(board.columns.done).toHaveLength(50);
    expect(board.columns.done.map(({ id }) => id)).toEqual(
      doneTasks.slice(2).map(({ id }) => id)
    );
    expect(board.columns.done.map(({ position }) => position)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 3)
    );
  });

  it('moves a To Do task into In Progress and only changes the target column order', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board target positions');
    const todoTasks = await seedTasks(account, project.id, [
      { title: 'Move to progress', position: 6 },
      { title: 'Remain in todo', position: 12 },
    ]);
    const inProgress = await seedTasks(account, project.id, [
      {
        title: 'Existing progress task',
        position: 15,
        boardStatus: 'in_progress',
      },
    ]);
    const done = await seedTasks(account, project.id, [
      { title: 'Remain done', position: 4, boardStatus: 'done' },
    ]);

    const response = await reorderColumn(
      project.id,
      'in_progress',
      [inProgress[0]!.id, todoTasks[0]!.id],
      account.token
    );

    expect(response.status).toBe(200);
    const board = boardResult((await getBoard(project.id, account.token)).body);
    expect(
      board.columns.inProgress.map(({ id, position }) => [id, position])
    ).toEqual([
      [inProgress[0]!.id, 0],
      [todoTasks[0]!.id, 1],
    ]);
    expect(
      board.columns.todo.map(({ id, position }) => [id, position])
    ).toEqual([[todoTasks[1]!.id, 12]]);
    expect(
      board.columns.done.map(({ id, position }) => [id, position])
    ).toEqual([[done[0]!.id, 4]]);
    const moved = await prisma.task.findUniqueOrThrow({
      where: { id: todoTasks[0]!.id },
    });
    expect(moved).toMatchObject({
      boardStatus: 'in_progress',
      isDone: false,
      position: 1,
    });
  });

  it('moves recurring tasks to Done, records completion, and creates one To Do occurrence in the same series', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board recurring completion');
    const today = localDate(new Date(), account.timezone);
    const [recurring] = await seedTasks(account, project.id, [
      {
        title: 'Recurring board task',
        position: 1,
        dueDate: new Date(`${today}T00:00:00.000Z`),
        recurrence: 'daily',
      },
    ]);

    const response = await reorderColumn(
      project.id,
      'done',
      [recurring!.id],
      account.token
    );

    expect(response.status).toBe(200);
    const completed = await prisma.task.findUniqueOrThrow({
      where: { id: recurring!.id },
    });
    expect(completed.boardStatus).toBe('done');
    expect(completed.isDone).toBe(true);
    expect(completed.doneAt).toBeInstanceOf(Date);
    const seriesTasks = await prisma.task.findMany({
      where: {
        userId: account.id,
        recurrenceSeriesId: recurring!.recurrenceSeriesId,
      },
      orderBy: { id: 'asc' },
    });
    expect(seriesTasks).toHaveLength(2);
    const nextOccurrence = seriesTasks.find(({ id }) => id !== recurring!.id);
    expect(nextOccurrence).toMatchObject({
      recurrenceSeriesId: recurring!.recurrenceSeriesId,
      recurrence: 'daily',
      boardStatus: 'todo',
      isDone: false,
      doneAt: null,
      dueDate: new Date(`${addDays(today, 1)}T00:00:00.000Z`),
    });
    const board = boardResult((await getBoard(project.id, account.token)).body);
    expect(board.columns.done).toHaveLength(1);
    expect(board.columns.todo.map(({ id }) => id)).toContain(
      nextOccurrence!.id
    );
    await assertBoardStateConsistent(account.id);
  });

  it('clears is_done when moving a task out of Done', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board move out of Done');
    const [completed] = await seedTasks(account, project.id, [
      {
        title: 'Move out of done',
        position: 3,
        boardStatus: 'done',
        doneAt: new Date(),
      },
    ]);

    const response = await reorderColumn(
      project.id,
      'todo',
      [completed!.id],
      account.token
    );

    expect(response.status).toBe(200);
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: completed!.id },
    });
    expect(task).toMatchObject({
      boardStatus: 'todo',
      isDone: false,
      doneAt: null,
      position: 0,
    });
    await assertBoardStateConsistent(account.id);
  });

  it('keeps the legacy completion endpoint synchronized with board columns', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Legacy completion board');
    const [task] = await seedTasks(account, project.id, [
      { title: 'Legacy completion task', position: 1 },
    ]);

    const completeResponse = await taskRequest(
      'PUT',
      `/api/tasks/${task!.id}`,
      account.token,
      { isDone: true }
    );
    expect(completeResponse.status).toBe(200);
    let board = boardResult((await getBoard(project.id, account.token)).body);
    expect(board.columns.done.map(({ id }) => id)).toContain(task!.id);
    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: task!.id } })
    ).toMatchObject({ boardStatus: 'done', isDone: true });

    const uncompleteResponse = await taskRequest(
      'PUT',
      `/api/tasks/${task!.id}`,
      account.token,
      { isDone: false }
    );
    expect(uncompleteResponse.status).toBe(200);
    board = boardResult((await getBoard(project.id, account.token)).body);
    expect(board.columns.todo.map(({ id }) => id)).toContain(task!.id);
    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: task!.id } })
    ).toMatchObject({ boardStatus: 'todo', isDone: false, doneAt: null });
    await assertBoardStateConsistent(account.id);
  });

  it('applies Sprint 5 task filters to all board columns', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board filters');
    const priorities = await priorityIds(account.id);
    const high = priorities.get('high');
    const medium = priorities.get('medium');
    if (high === undefined || medium === undefined) {
      throw new Error('Integration account is missing high or medium priority');
    }
    const dueDate = addDays(localDate(new Date(), account.timezone), 2);
    const label = await prisma.label.create({
      data: { userId: account.id, name: 'Board filter label' },
    });
    const matching = await seedTasks(account, project.id, [
      {
        title: 'High recurring labeled task',
        position: 1,
        priorityId: high,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        recurrence: 'daily',
      },
    ]);
    const wrongPriority = await seedTasks(account, project.id, [
      {
        title: 'Medium recurring labeled task',
        position: 2,
        priorityId: medium,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        recurrence: 'daily',
      },
    ]);
    const notRecurring = await seedTasks(account, project.id, [
      {
        title: 'High one-time labeled task',
        position: 3,
        priorityId: high,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
      },
    ]);
    const outsideRange = await seedTasks(account, project.id, [
      {
        title: 'High recurring outside date range',
        position: 4,
        priorityId: high,
        dueDate: new Date(`${addDays(dueDate, 1)}T00:00:00.000Z`),
        recurrence: 'daily',
      },
    ]);
    const completed = await seedTasks(account, project.id, [
      {
        title: 'Completed matching task',
        position: 5,
        boardStatus: 'done',
        priorityId: high,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        recurrence: 'daily',
      },
    ]);
    await prisma.taskLabel.createMany({
      data: [
        ...matching,
        ...wrongPriority,
        ...notRecurring,
        ...outsideRange,
        ...completed,
      ].map(({ id }) => ({ taskId: id, labelId: label.id })),
    });

    const query = new URLSearchParams({
      projectId: String(project.id),
      status: 'active',
      priority: 'HIGH',
      recurring: 'true',
      labelId: String(label.id),
      dueFrom: dueDate,
      dueTo: dueDate,
      hasDueDate: 'true',
    });
    const response = await taskRequest(
      'GET',
      `/api/tasks/board?${query}`,
      account.token
    );

    expect(response.status).toBe(200);
    const board = boardResult(response.body);
    expect(board.counts).toEqual({ todo: 1, inProgress: 0, done: 0 });
    expect(board.columns.todo.map(({ id }) => id)).toEqual([matching[0]!.id]);
    expect(board.columns.inProgress).toEqual([]);
    expect(board.columns.done).toEqual([]);
  });

  it('rejects invalid input, hides foreign tasks, and rejects stale column orders without mutations', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const project = await seedProject(account.id, 'Board errors');
    const otherProject = await seedProject(account.id, 'Other board project');
    const foreignUserProject = await seedProject(
      otherAccount.id,
      'Foreign board project'
    );
    const [first, second] = await seedTasks(account, project.id, [
      { title: 'Board task one', position: 4 },
      { title: 'Board task two', position: 7 },
    ]);
    await seedTasks(account, project.id, [
      { title: 'Board task three', position: 11 },
    ]);
    const [anotherProjectTask] = await seedTasks(account, otherProject.id, [
      { title: 'Task in another project', position: 1 },
    ]);
    const [anotherUserTask] = await seedTasks(
      otherAccount,
      foreignUserProject.id,
      [{ title: 'Task owned by another user', position: 1 }]
    );
    const before = await prisma.task.findMany({
      where: { userId: account.id, projectId: project.id },
      orderBy: { id: 'asc' },
      select: { id: true, boardStatus: true, isDone: true, position: true },
    });

    for (const invalidBody of [
      { projectId: project.id, boardStatus: 'invalid', tasks: [first!.id] },
      { projectId: project.id, boardStatus: 'todo', tasks: [0] },
      { projectId: project.id, boardStatus: 'todo', tasks: ['not-an-id'] },
    ]) {
      const response = await taskRequest(
        'PUT',
        '/api/tasks/board/reorder',
        account.token,
        invalidBody
      );
      expect(response.status).toBe(400);
    }

    for (const foreignTaskId of [anotherProjectTask!.id, anotherUserTask!.id]) {
      const response = await reorderColumn(
        project.id,
        'todo',
        [first!.id, foreignTaskId, second!.id],
        account.token
      );
      expect(response.status).toBe(404);
    }

    const staleResponse = await reorderColumn(
      project.id,
      'todo',
      [second!.id, first!.id],
      account.token
    );
    expect(staleResponse.status).toBe(409);
    const after = await prisma.task.findMany({
      where: { userId: account.id, projectId: project.id },
      orderBy: { id: 'asc' },
      select: { id: true, boardStatus: true, isDone: true, position: true },
    });
    expect(after).toEqual(before);
  });

  it('never leaves board_status and is_done inconsistent', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, 'Board consistency');
    const [task] = await seedTasks(account, project.id, [
      { title: 'Consistency task', position: 1 },
    ]);

    for (const boardStatus of ['in_progress', 'done', 'todo'] as const) {
      const response = await reorderColumn(
        project.id,
        boardStatus,
        [task!.id],
        account.token
      );
      expect(response.status).toBe(200);
      await assertBoardStateConsistent(account.id);
    }

    for (const isDone of [true, false]) {
      const response = await taskRequest(
        'PUT',
        `/api/tasks/${task!.id}`,
        account.token,
        { isDone }
      );
      expect(response.status).toBe(200);
      await assertBoardStateConsistent(account.id);
    }
  });

  it('requires authentication for board reads and reorder writes', async () => {
    const readResponse = await taskRequest(
      'GET',
      '/api/tasks/board?projectId=1'
    );
    const writeResponse = await reorderColumn(1, 'todo', [1]);

    expect(readResponse.status).toBe(401);
    expect(writeResponse.status).toBe(401);
  });
});
