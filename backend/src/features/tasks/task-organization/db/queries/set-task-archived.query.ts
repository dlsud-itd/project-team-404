import { prisma } from '../../../../../shared/db/prisma.client';

const taskInclude = {
  priorityLevel: true,
  taskLabels: { include: { label: true } },
} as const;

export async function setTaskArchived(
  taskId: number,
  userId: string,
  isArchived: boolean
) {
  const updated = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId,
      deletedAt: null,
      archivedAt: isArchived ? null : { not: null },
    },
    data: { archivedAt: isArchived ? new Date() : null },
  });

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
    include: taskInclude,
  });
  if (
    !task ||
    (updated.count === 0 && (task.archivedAt !== null) !== isArchived)
  ) {
    return null;
  }
  return task;
}
