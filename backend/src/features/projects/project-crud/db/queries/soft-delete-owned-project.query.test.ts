import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { softDeleteOwnedProject } from './soft-delete-owned-project.query';

describe('softDeleteOwnedProject', () => {
  const transaction = {
    project: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    task: {
      updateMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
    );
    transaction.project.findFirst.mockResolvedValue({ id: 1 });
    transaction.project.updateMany.mockResolvedValue({ count: 1 });
    transaction.task.updateMany.mockResolvedValue({ count: 3 });
  });

  it('moves active owned tasks to the Inbox and soft-deletes the project atomically', async () => {
    await expect(softDeleteOwnedProject(7, 'user-123')).resolves.toBe(3);

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(transaction.project.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-123', isInbox: true, deletedAt: null },
      select: { id: true },
    });
    expect(transaction.project.updateMany).toHaveBeenCalledWith({
      where: { id: 7, userId: 'user-123', deletedAt: null, isInbox: false },
      data: {
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(transaction.task.updateMany).toHaveBeenCalledWith({
      where: { projectId: 7, userId: 'user-123', deletedAt: null },
      data: { projectId: 1, updatedAt: expect.any(Date) },
    });
  });

  it('does not move tasks when the project is no longer deletable', async () => {
    transaction.project.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(softDeleteOwnedProject(7, 'user-123')).resolves.toBeNull();

    expect(transaction.project.findFirst).not.toHaveBeenCalled();
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });

  it('fails explicitly when the owner has no active Inbox', async () => {
    transaction.project.findFirst.mockResolvedValueOnce(null);

    await expect(softDeleteOwnedProject(7, 'user-123')).rejects.toThrow(
      'Inbox project not found for owner'
    );

    expect(transaction.project.updateMany).toHaveBeenCalledOnce();
    expect(transaction.task.updateMany).not.toHaveBeenCalled();
  });

  it('propagates a task-move failure so the transaction can roll back', async () => {
    transaction.task.updateMany.mockRejectedValueOnce(
      new Error('Task move failed')
    );

    await expect(softDeleteOwnedProject(7, 'user-123')).rejects.toThrow(
      'Task move failed'
    );

    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
