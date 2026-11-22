import { prisma } from '../../../../../shared/db/prisma.client';

export async function findOwnedTask(taskId: number, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
    include: {
      priorityLevel: true,
      taskLabels: { include: { label: true } },
    },
  });
}
