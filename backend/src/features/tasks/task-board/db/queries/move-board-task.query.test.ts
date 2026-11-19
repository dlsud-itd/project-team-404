import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock('../../../task-crud/db/queries/update-task.query', () => ({
  updateTask: mocks.updateTask,
}));

import { TaskNotFoundError } from '../../../task-crud/errors/task-not-found.error';
import { TaskReorderConflictError } from '../../../task-organization/errors/task-reorder-conflict.error';
import { moveBoardTask } from './move-board-task.query';

describe('moveBoardTask', () => {
  const transaction = {
    task: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const todoTask = {
    id: 11,
    projectId: 7,
    boardStatus: 'todo' as const,
    isDone: false,
    position: 1,
    doneAt: null,
    deletedAt: null,
    archivedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.task.findMany
      .mockResolvedValueOnce([todoTask])
      .mockResolvedValueOnce([todoTask]);
    transaction.task.updateMany.mockResolvedValue({ count: 1 });
    mocks.updateTask.mockResolvedValue({ id: todoTask.id });
  });

  it('moves a task into Done through the shared completion workflow', async () => {
    const request = { projectId: 7, boardStatus: 'done' as const, tasks: [11] };

    await expect(moveBoardTask('user-1', request)).resolves.toEqual(request);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateTask).toHaveBeenCalledWith(
      11,
      'user-1',
      { isDone: true },
      transaction
    );
    expect(transaction.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { boardStatus: 'done', position: 0 },
      })
    );
  });

  it('uncompletes a Done task before moving it into To Do', async () => {
    const doneTask = {
      ...todoTask,
      boardStatus: 'done' as const,
      isDone: true,
      doneAt: new Date('2026-11-19T00:00:00.000Z'),
    };
    transaction.task.findMany
      .mockReset()
      .mockResolvedValueOnce([doneTask])
      .mockResolvedValueOnce([doneTask]);

    await moveBoardTask('user-1', {
      projectId: 7,
      boardStatus: 'todo',
      tasks: [11],
    });

    expect(mocks.updateTask).toHaveBeenCalledWith(
      11,
      'user-1',
      { isDone: false },
      transaction
    );
    expect(transaction.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ boardStatus: 'todo', isDone: false }),
        data: { boardStatus: 'todo', position: 0 },
      })
    );
  });

  it('rejects stale target-column membership without writing', async () => {
    const currentTarget = {
      ...todoTask,
      id: 12,
      boardStatus: 'in_progress' as const,
    };
    const movedCandidate = { ...todoTask, id: 13 };
    transaction.task.findMany
      .mockReset()
      .mockResolvedValueOnce([movedCandidate])
      .mockResolvedValueOnce([currentTarget, movedCandidate]);

    await expect(
      moveBoardTask('user-1', {
        projectId: 7,
        boardStatus: 'in_progress',
        tasks: [13],
      })
    ).rejects.toBeInstanceOf(TaskReorderConflictError);
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });

  it('returns not found for tasks outside the requested project', async () => {
    transaction.task.findMany
      .mockReset()
      .mockResolvedValueOnce([{ ...todoTask, projectId: 8 }]);

    await expect(
      moveBoardTask('user-1', {
        projectId: 7,
        boardStatus: 'in_progress',
        tasks: [11],
      })
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });
});
