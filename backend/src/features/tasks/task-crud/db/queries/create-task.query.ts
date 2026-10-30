import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateTaskInput } from '../../types/task-crud.types';

export async function createTask(userId: string, input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      projectId: input.projectId ?? null,
      dueDate: input.dueDate
        ? new Date(`${input.dueDate}T00:00:00.000Z`)
        : null,
      priority: input.priority ?? 'medium',
      isDone: input.isDone ?? false,
      doneAt: input.doneAt ? new Date(input.doneAt) : null,
    },
  });
}
