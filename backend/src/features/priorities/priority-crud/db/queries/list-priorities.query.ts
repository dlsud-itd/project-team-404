import { prisma } from '../../../../../shared/db/prisma.client';

export async function listPriorities(userId: string) {
  return prisma.priorityLevel.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });
}
