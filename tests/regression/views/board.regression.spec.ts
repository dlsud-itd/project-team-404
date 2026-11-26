import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createProject, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type BoardTask = {
  id: number;
  boardStatus: 'todo' | 'in_progress' | 'done';
  isDone: boolean;
};

integrationDescribe('Board view regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('keeps checkbox state aligned with Done and does not change dashboard counts on reorder', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const projectId = await createProject(api, 'Board regression');
    const dueDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: account.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const first = await createTask(api, {
      projectId,
      title: 'First board task',
      dueDate,
    });
    const second = await createTask(api, {
      projectId,
      title: 'Second board task',
      dueDate,
    });

    const dashboardBefore = await api.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    expect(dashboardBefore.status).toBe(200);
    const initialTotal = (dashboardBefore.body as { total: number }).total;
    const boardPath = `/api/tasks/board?projectId=${projectId}`;
    const initialBoard = await api.get(boardPath);
    expect(initialBoard.status).toBe(200);
    const initialCounts = (
      initialBoard.body as {
        counts: { todo: number; inProgress: number; done: number };
      }
    ).counts;

    expect(
      (
        await api.put('/api/tasks/board/reorder', {
          projectId,
          boardStatus: 'todo',
          tasks: [second.id, first.id],
        })
      ).status
    ).toBe(200);
    const reorderedBoard = await api.get(boardPath);
    expect(reorderedBoard.status).toBe(200);
    expect(
      (
        reorderedBoard.body as {
          counts: { todo: number; inProgress: number; done: number };
        }
      ).counts
    ).toEqual(initialCounts);
    const dashboardAfterReorder = await api.get(
      '/api/dashboard/current-upcoming-tasks?days=7'
    );
    expect((dashboardAfterReorder.body as { total: number }).total).toBe(
      initialTotal
    );

    for (const isDone of [true, false]) {
      expect((await api.put(`/api/tasks/${first.id}`, { isDone })).status).toBe(
        200
      );
      const board = await api.get(boardPath);
      expect(board.status).toBe(200);
      const body = board.body as {
        columns: {
          todo: BoardTask[];
          inProgress: BoardTask[];
          done: BoardTask[];
        };
      };
      const tasks = [
        ...body.columns.todo,
        ...body.columns.inProgress,
        ...body.columns.done,
      ];
      expect(
        tasks.every((task) => task.isDone === (task.boardStatus === 'done'))
      ).toBe(true);
      expect(body.columns.done.some(({ id }) => id === first.id)).toBe(isDone);
    }
  });
});
