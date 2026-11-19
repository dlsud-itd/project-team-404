import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findPriority: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: {
    $transaction: mocks.transaction,
    priorityLevel: { findFirst: mocks.findPriority },
  },
}));

import { createTask } from './create-task.query';

describe('createTask', () => {
  const transaction = {
    task: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findPriority.mockResolvedValue({ id: 2 });
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.task.aggregate.mockResolvedValue({ _max: { position: 4 } });
    transaction.task.create.mockResolvedValue({ id: 8, position: 5 });
  });

  it('appends a new task after the active tasks in its project', async () => {
    await expect(
      createTask('user-1', { title: 'New task', projectId: 7 })
    ).resolves.toEqual({ id: 8, position: 5 });

    expect(transaction.task.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        projectId: 7,
        deletedAt: null,
        archivedAt: null,
      },
      _max: { position: true },
    });
    expect(transaction.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 5 }),
      })
    );
  });

  it('starts a new project at position one', async () => {
    transaction.task.aggregate.mockResolvedValueOnce({
      _max: { position: null },
    });

    await createTask('user-1', { title: 'First task', projectId: 7 });

    expect(transaction.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 1 }),
      })
    );
  });
});
