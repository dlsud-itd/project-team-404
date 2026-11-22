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
      update: vi.fn(),
      create: vi.fn(),
    },
    taskCompletionEvent: { upsert: vi.fn() },
    priorityLevel: { findFirst: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'UTC' }) },
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

  it('updates board status together with completion state', async () => {
    await updateTask(1, 'user-1', { isDone: true });

    expect(transaction.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDone: true,
          boardStatus: 'done',
        }),
      })
    );
  });

  it('keeps an in-progress status when completion remains false', async () => {
    transaction.task.findFirst
      .mockReset()
      .mockResolvedValueOnce({ ...currentTask, boardStatus: 'in_progress' })
      .mockResolvedValueOnce({ ...currentTask, boardStatus: 'in_progress' });

    await updateTask(1, 'user-1', { isDone: false });

    expect(transaction.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDone: false,
          boardStatus: 'in_progress',
        }),
      })
    );
  });

  it('records and generates a recurring completion only once', async () => {
    const recurringTask = {
      ...currentTask,
      recurrence: 'daily' as const,
      recurrenceDays: [],
      recurrenceEndDate: null,
      recurrenceSeriesId: null,
      title: 'Daily task',
      description: null,
      priorityId: 2,
      dueDate: new Date('2026-11-18T00:00:00.000Z'),
    };
    const completedTask = {
      ...recurringTask,
      isDone: true,
      boardStatus: 'done' as const,
      doneAt: new Date('2026-11-19T00:00:00.000Z'),
    };
    transaction.task.findFirst
      .mockReset()
      .mockResolvedValueOnce(recurringTask)
      .mockResolvedValueOnce(completedTask)
      .mockResolvedValueOnce(completedTask)
      .mockResolvedValueOnce(completedTask);

    await updateTask(1, 'user-1', { isDone: true });
    await updateTask(1, 'user-1', { isDone: true });

    expect(transaction.taskCompletionEvent.upsert).toHaveBeenCalledTimes(1);
    expect(transaction.task.create).toHaveBeenCalledTimes(1);
    expect(transaction.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDone: false,
          recurrence: 'daily',
          recurrenceSeriesId: expect.any(String),
        }),
      })
    );
  });
});
