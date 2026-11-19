import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../../../task-crud/errors/task-not-found.error';
import { TaskReorderConflictError } from '../../errors/task-reorder-conflict.error';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { updateTaskPositions } from './update-task-positions.query';

describe('updateTaskPositions', () => {
  const transaction = {
    task: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.task.findMany.mockResolvedValue([
      { id: 3 },
      { id: 1 },
      { id: 2 },
    ]);
    transaction.task.updateMany.mockResolvedValue({ count: 1 });
  });

  it('updates positions atomically in the requested order', async () => {
    await expect(
      updateTaskPositions(7, [2, 3, 1], 'user-123')
    ).resolves.toEqual([
      { taskId: 2, position: 1 },
      { taskId: 3, position: 2 },
      { taskId: 1, position: 3 },
    ]);

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(transaction.task.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 7,
        userId: 'user-123',
        deletedAt: null,
        archivedAt: null,
        isDone: false,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    expect(transaction.task.updateMany).toHaveBeenCalledTimes(3);
  });

  it('returns 404 for IDs outside the active owned project list', async () => {
    await expect(
      updateTaskPositions(7, [2, 3, 99], 'user-123')
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when an active project task is omitted', async () => {
    await expect(
      updateTaskPositions(7, [2, 3], 'user-123')
    ).rejects.toBeInstanceOf(TaskReorderConflictError);
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });

  it('aborts if a task changes during the transactional update', async () => {
    transaction.task.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      updateTaskPositions(7, [2, 3, 1], 'user-123')
    ).rejects.toBeInstanceOf(TaskReorderConflictError);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
