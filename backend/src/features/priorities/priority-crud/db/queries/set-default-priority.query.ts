import { prisma } from '../../../../../shared/db/prisma.client';

export async function setDefaultPriority(priorityId: number, userId: string) {
  const priority = await prisma.priorityLevel.findFirst({
    where: { id: priorityId, userId, deletedAt: null },
  });
  if (!priority) return null;

  await prisma.priorityLevel.updateMany({
    where: { userId, deletedAt: null },
    data: { isDefault: false },
  });

  return prisma.priorityLevel.update({
    where: { id: priorityId },
    data: { isDefault: true },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });
}
