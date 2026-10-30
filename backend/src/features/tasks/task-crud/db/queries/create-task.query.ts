import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateTaskInput } from '../../types/task-crud.types';

export async function createTask(userId: string, input: CreateTaskInput) {
  const priorityLevel = await prisma.priorityLevel.findUnique({
    where: { name: input.priority ?? 'medium' },
    select: { id: true },
  });
  if (!priorityLevel) {
    throw new Error(
      `Priority level is not configured: ${input.priority ?? 'medium'}`
    );
  }

  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      projectId: input.projectId ?? null,
      priorityId: priorityLevel.id,
      scheduledDate: input.scheduledDate
        ? new Date(`${input.scheduledDate}T00:00:00.000Z`)
        : null,
      dueDate: input.dueDate
        ? new Date(`${input.dueDate}T00:00:00.000Z`)
        : null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      recurrence: input.recurrence ?? 'none',
      isDone: input.isDone ?? false,
      doneAt: input.doneAt ? new Date(input.doneAt) : null,
    },
    include: {
      priorityLevel: true,
      taskLabels: { include: { label: true } },
    },
  });
}
