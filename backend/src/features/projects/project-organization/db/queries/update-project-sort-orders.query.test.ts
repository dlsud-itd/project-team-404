import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectNotFoundError } from '../../../project-crud/errors/project-crud.errors';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { updateProjectSortOrders } from './update-project-sort-orders.query';

describe('updateProjectSortOrders', () => {
  const transaction = {
    project: {
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
    transaction.project.findMany.mockResolvedValue([
      { id: 3 },
      { id: 1 },
      { id: 2 },
    ]);
    transaction.project.updateMany.mockResolvedValue({ count: 1 });
  });

  it('updates the requested order and keeps omitted projects afterward', async () => {
    await expect(updateProjectSortOrders([2, 3], 'user-123')).resolves.toEqual([
      { projectId: 2, sortOrder: 0 },
      { projectId: 3, sortOrder: 1 },
      { projectId: 1, sortOrder: 2 },
    ]);

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(transaction.project.updateMany).toHaveBeenCalledTimes(3);
    expect(transaction.project.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 2, userId: 'user-123', deletedAt: null, isInbox: false },
      data: expect.objectContaining({ sortOrder: 0 }),
    });
  });

  it('rejects unknown or unowned project IDs before writing', async () => {
    await expect(
      updateProjectSortOrders([99], 'user-123')
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(transaction.project.updateMany).not.toHaveBeenCalled();
  });

  it('fails the transaction if an owned project disappears during the reorder', async () => {
    transaction.project.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      updateProjectSortOrders([2, 3], 'user-123')
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
