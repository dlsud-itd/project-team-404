import { prisma } from '../../../../../shared/db/prisma.client';
import type { UpdateTaskInput } from '../../types/task-crud.types';
import { toRecurrenceData } from '../../../task-scheduling/utils/recurrence-data.util';
import { RecurrenceService } from '../../../task-scheduling/services/recurrence.service';
import { InvalidTaskPriorityError } from '../../errors/invalid-task-priority.error';
import { TaskArchivedError } from '../../../shared/errors/task-archived.error';
import { getNextTaskPosition } from './get-next-task-position.query';
import { randomUUID } from 'node:crypto';

const recurrenceService = new RecurrenceService();
const taskInclude = {
  priorityLevel: true,
  taskLabels: { include: { label: true } },
} as const;

export async function updateTask(
  taskId: number,
  userId: string,
  input: UpdateTaskInput
) {
  return prisma.$transaction(async (transaction) => {
    const currentTask = await transaction.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      include: taskInclude,
    });
    if (!currentTask) return null;
    if (currentTask.archivedAt !== null) {
      throw new TaskArchivedError();
    }

    const completing = input.isDone === true && !currentTask.isDone;
    const uncompleting = input.isDone === false && currentTask.isDone;
    const targetProjectId = input.projectId ?? currentTask.projectId;
    let position: number | undefined;
    if (completing) {
      position = await getNextTaskPosition(
        transaction,
        userId,
        targetProjectId,
        true
      );
    } else if (uncompleting) {
      position = await getNextTaskPosition(
        transaction,
        userId,
        targetProjectId,
        false
      );
    } else if (targetProjectId !== currentTask.projectId) {
      position = await getNextTaskPosition(
        transaction,
        userId,
        targetProjectId,
        currentTask.isDone
      );
    }
    const priorityLevel =
      input.priorityId !== undefined
        ? await transaction.priorityLevel.findFirst({
            where: { id: input.priorityId, userId, deletedAt: null },
            select: { id: true },
          })
        : input.priority !== undefined
          ? await transaction.priorityLevel.findFirst({
              where: {
                userId,
                deletedAt: null,
                name: { equals: input.priority, mode: 'insensitive' },
              },
              select: { id: true },
            })
          : null;
    if (
      (input.priority !== undefined || input.priorityId !== undefined) &&
      !priorityLevel
    ) {
      throw new InvalidTaskPriorityError();
    }

    const result = await transaction.task.updateMany({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
        archivedAt: null,
        ...(completing ? { isDone: false } : {}),
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.projectId !== undefined
          ? { projectId: input.projectId }
          : {}),
        ...(position !== undefined ? { position } : {}),
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
        ...toRecurrenceData(input),
        ...(input.priority !== undefined || input.priorityId !== undefined
          ? { priorityId: priorityLevel!.id }
          : {}),
        ...(input.isDone !== undefined ? { isDone: input.isDone } : {}),
        ...(completing
          ? { doneAt: new Date() }
          : uncompleting
            ? { doneAt: null }
            : input.doneAt !== undefined
              ? { doneAt: input.doneAt ? new Date(input.doneAt) : null }
              : {}),
      },
    });

    const updatedTask = await transaction.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      include: taskInclude,
    });
    if (!updatedTask) return null;
    if (updatedTask.archivedAt !== null) {
      throw new TaskArchivedError();
    }
    if (result.count === 0 && !updatedTask.isDone) return null;

    if (completing && result.count > 0) {
      const owner = await transaction.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      const timezone = owner?.timezone ?? 'UTC';
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const seriesId =
        updatedTask.recurrenceSeriesId ??
        (updatedTask.recurrence && updatedTask.recurrence !== 'none'
          ? randomUUID()
          : null);
      if (seriesId && !updatedTask.recurrenceSeriesId) {
        await transaction.task.update({
          where: { id: updatedTask.id },
          data: { recurrenceSeriesId: seriesId },
        });
      }
      await transaction.taskCompletionEvent.upsert({
        where: {
          taskId_completedOn: {
            taskId: updatedTask.id,
            completedOn: new Date(`${today}T00:00:00.000Z`),
          },
        },
        create: {
          taskId: updatedTask.id,
          userId,
          seriesId,
          completedOn: new Date(`${today}T00:00:00.000Z`),
        },
        update: {},
      });
      const next = recurrenceService.createNextOccurrence(
        updatedTask,
        timezone
      );
      if (next) {
        const dueDate = new Date(`${next.dueDate}T00:00:00.000Z`);
        const deadline = updatedTask.deadline
          ? new Date(
              dueDate.getTime() +
                (updatedTask.deadline.getTime() -
                  updatedTask.dueDate!.getTime())
            )
          : null;
        await transaction.task.create({
          data: {
            userId: updatedTask.userId,
            projectId: updatedTask.projectId,
            position: await getNextTaskPosition(
              transaction,
              updatedTask.userId,
              updatedTask.projectId,
              false
            ),
            title: updatedTask.title,
            description: updatedTask.description,
            priorityId: updatedTask.priorityId,
            scheduledDate: next.scheduledDate
              ? new Date(`${next.scheduledDate}T00:00:00.000Z`)
              : null,
            dueDate,
            deadline,
            recurrence: updatedTask.recurrence ?? 'none',
            recurrenceDays: updatedTask.recurrenceDays ?? [],
            recurrenceEndDate: updatedTask.recurrenceEndDate,
            recurrenceSeriesId: seriesId,
            isDone: false,
            doneAt: null,
            taskLabels: {
              create: updatedTask.taskLabels.map(({ labelId }) => ({
                labelId,
              })),
            },
          },
        });
      }
    }

    return updatedTask;
  });
}
