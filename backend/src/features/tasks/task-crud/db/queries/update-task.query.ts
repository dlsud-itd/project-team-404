import { prisma } from '../../../../../shared/db/prisma.client';
import type { UpdateTaskInput } from '../../types/task-crud.types';

export async function updateTask(
  taskId: number,
  userId: string,
  input: UpdateTaskInput
) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, userId, deletedAt: null },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.dueDate !== undefined
        ? {
            dueDate: input.dueDate
              ? new Date(`${input.dueDate}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.isDone !== undefined ? { isDone: input.isDone } : {}),
      ...(input.doneAt !== undefined
        ? { doneAt: input.doneAt ? new Date(input.doneAt) : null }
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
