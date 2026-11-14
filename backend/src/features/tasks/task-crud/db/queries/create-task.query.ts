import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateTaskInput } from '../../types/task-crud.types';
import { toRecurrenceData } from '../../../task-scheduling/utils/recurrence-data.util';
import { InvalidTaskPriorityError } from '../../errors/invalid-task-priority.error';

export async function createTask(userId: string, input: CreateTaskInput) {
  const priorityLevel = await resolveUserPriorityLevel(userId, input);
  if (!priorityLevel) {
    if (input.priority !== undefined || input.priorityId !== undefined) {
      throw new InvalidTaskPriorityError();
    }
    throw new Error('Default priority is not configured for this user');
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
      ...toRecurrenceData({
        recurrence: input.recurrence ?? 'none',
        recurrenceDays: input.recurrenceDays,
        recurrenceEndDate: input.recurrenceEndDate,
      }),
      isDone: input.isDone ?? false,
      doneAt: input.doneAt ? new Date(input.doneAt) : null,
    },
    include: {
      priorityLevel: true,
      taskLabels: { include: { label: true } },
    },
  });
}

async function resolveUserPriorityLevel(
  userId: string,
  input: CreateTaskInput
) {
  if (input.priorityId !== undefined) {
    return prisma.priorityLevel.findFirst({
      where: { id: input.priorityId, userId, deletedAt: null },
      select: { id: true },
    });
  }

  if (input.priority !== undefined) {
    return prisma.priorityLevel.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: input.priority, mode: 'insensitive' },
      },
      select: { id: true },
    });
  }

  return prisma.priorityLevel.findFirst({
    where: { userId, deletedAt: null, isDefault: true },
    select: { id: true },
  });
}
