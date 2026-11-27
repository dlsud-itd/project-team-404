import { prisma } from '../../../../../shared/db/prisma.client';

export async function setDefaultPriority(priorityId: number, userId: string) {
  const priority = await prisma.priorityLevel.findFirst({
    // An archived level is hidden from pickers, so it can't be what new tasks get.
    where: { id: priorityId, userId, deletedAt: null, archivedAt: null },
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
