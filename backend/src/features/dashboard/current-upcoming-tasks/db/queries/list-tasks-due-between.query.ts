import { prisma } from '../../../../../shared/db/prisma.client';

export async function listTasksDueBetween(
  userId: string,
  startDate: string,
  endDate: string
) {
  return prisma.task.findMany({
    where: {
      userId,
      isDone: false,
      deletedAt: null,
      dueDate: {
        gte: toDatabaseDate(startDate),
        lte: toDatabaseDate(endDate),
      },
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

function toDatabaseDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
