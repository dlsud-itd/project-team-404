import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';

export async function reorderPriorities(userId: string, priorityIds: number[]) {
  const owned = await prisma.priorityLevel.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  const ownedIds = owned.map(({ id }: { id: number }) => id);
  const uniqueIds = [...new Set(priorityIds)];
  if (
    uniqueIds.length !== priorityIds.length ||
    uniqueIds.some((id) => !ownedIds.includes(id))
  ) {
    throw new Error('Invalid priority reorder request');
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updates = uniqueIds.map((id, index) =>
      tx.priorityLevel.update({
        where: { id },
        data: { sortOrder: index + 1 },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      })
    );
    return Promise.all(updates);
  });
}
