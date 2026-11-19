import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { updateTask } from './update-task.query';

describe('updateTask', () => {
  const currentTask = {
    id: 1,
    userId: 'user-1',
    projectId: 3,
    isDone: false,
    archivedAt: null,
    taskLabels: [],
  };
  const transaction = {
    task: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    priorityLevel: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.task.findFirst
      .mockResolvedValueOnce(currentTask)
      .mockResolvedValueOnce({ ...currentTask, projectId: 7, position: 5 });
    transaction.task.aggregate.mockResolvedValue({ _max: { position: 4 } });
    transaction.task.updateMany.mockResolvedValue({ count: 1 });
  });

  it('appends a task to the destination project when moved', async () => {
    await updateTask(1, 'user-1', { projectId: 7 });

    expect(transaction.task.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        projectId: 7,
        deletedAt: null,
        archivedAt: null,
        isDone: false,
      },
      _max: { position: true },
    });
    expect(transaction.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: 7, position: 5 }),
      })
    );
  });
});
