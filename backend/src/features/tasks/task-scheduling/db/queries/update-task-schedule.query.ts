import { prisma } from '../../../../../shared/db/prisma.client';
import type { TaskScheduleUpdateInput } from '../../task-scheduling.types';

export async function updateTaskSchedule(
  taskId: number,
  userId: string,
  input: TaskScheduleUpdateInput
) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, userId, deletedAt: null },
    data: {
      ...(input.scheduledDate !== undefined
        ? {
            scheduledDate: input.scheduledDate
              ? new Date(`${input.scheduledDate}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(input.dueDate !== undefined
        ? {
            dueDate: input.dueDate
              ? new Date(`${input.dueDate}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(input.deadline !== undefined
        ? { deadline: input.deadline ? new Date(input.deadline) : null }
        : {}),
      ...(input.recurrence !== undefined
        ? { recurrence: input.recurrence ?? 'none' }
        : {}),
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });
}
