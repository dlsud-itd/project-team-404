import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { listBoardTasks } from './list-board-tasks.query';

describe('listBoardTasks', () => {
  const transaction = {
    task: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.task.groupBy.mockResolvedValue([
      { boardStatus: 'todo', _count: { _all: 2 } },
      { boardStatus: 'in_progress', _count: { _all: 1 } },
      { boardStatus: 'done', _count: { _all: 54 } },
    ]);
    transaction.task.findMany
      .mockResolvedValueOnce([
        {
          id: 1,
          title: 'Todo task',
          boardStatus: 'todo',
          isDone: false,
          position: 0,
          doneAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          title: 'In progress task',
          boardStatus: 'in_progress',
          isDone: false,
          position: 0,
          doneAt: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 3 }])
      .mockResolvedValueOnce([
        {
          id: 3,
          title: 'Done task',
          boardStatus: 'done',
          isDone: true,
          position: 0,
          doneAt: new Date('2026-11-19T00:00:00.000Z'),
        },
      ]);
  });

  it('groups by board status, counts all Done tasks, and caps recent Done tasks', async () => {
    const result = await listBoardTasks('user-1', {
      projectId: 7,
      status: 'all',
    });

    expect(result.counts).toEqual({ todo: 2, inProgress: 1, done: 54 });
    expect(result.columns.done).toHaveLength(1);
    expect(transaction.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['boardStatus'] })
    );
    expect(transaction.task.findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        take: 50,
        orderBy: [{ doneAt: 'desc' }, { id: 'desc' }],
      })
    );
    expect(transaction.task.findMany).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ orderBy: [{ position: 'asc' }, { id: 'asc' }] })
    );
  });
});
