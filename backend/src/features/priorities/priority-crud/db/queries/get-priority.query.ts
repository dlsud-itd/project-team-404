import { prisma } from '../../../../../shared/db/prisma.client';

export async function getPriority(priorityId: number, userId: string) {
  return prisma.priorityLevel.findFirst({
    where: { id: priorityId, userId, deletedAt: null },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });
}
