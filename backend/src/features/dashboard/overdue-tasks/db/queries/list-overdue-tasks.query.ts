import { prisma } from '../../../../../shared/db/prisma.client';

export async function listOverdueTasks(userId: string, before: Date) {
  return prisma.task.findMany({
    where: {
      userId,
      isDone: false,
      deletedAt: null,
      archivedAt: null,
      dueDate: { not: null, lt: before },
      OR: [
        { projectId: null },
        {
          project: {
            is: { isArchived: false, deletedAt: null },
          },
        },
      ],
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    include: {
      priorityLevel: true,
      taskLabels: { include: { label: true } },
    },
  });
}
