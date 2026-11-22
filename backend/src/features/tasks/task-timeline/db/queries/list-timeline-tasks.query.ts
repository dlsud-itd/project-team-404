import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';
import { getDateWindow } from '../../../../dashboard/shared/utils/date-window.util';
import type { TimelineQueryResult } from '../../types/timeline.types';
import type { TimelineQuery } from '../../validators/timeline-query.validator';

export async function listTimelineTasks(
  userId: string,
  query: TimelineQuery
): Promise<TimelineQueryResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = user?.timezone ?? 'UTC';
  const today = getDateWindow(timeZone, 0).startDate;
  const where = buildTimelineTasksWhere(query, userId, today);
  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { scheduledDate: { sort: 'asc', nulls: 'last' } },
      { dueDate: 'asc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      projectId: true,
      scheduledDate: true,
      dueDate: true,
      deadline: true,
      isDone: true,
      project: { select: { name: true, color: true } },
      priorityLevel: { select: { name: true } },
    },
  });
  return { tasks, timeZone, today };
}

export function buildTimelineTasksWhere(
  query: TimelineQuery,
  userId: string,
  today: string
): Prisma.TaskWhereInput {
  const from = toDate(query.from);
  const to = toDate(query.to);
  const broadDeadlineFrom = new Date(from.getTime() - 86_400_000);
  const and: Prisma.TaskWhereInput[] = [
    {
      OR: [
        { projectId: null },
        { project: { is: { isArchived: false, deletedAt: null } } },
      ],
    },
    {
      OR: [
        { scheduledDate: null, dueDate: null },
        {
          AND: [
            {
              OR: [
                { scheduledDate: { lte: to } },
                { scheduledDate: null, dueDate: { lte: to } },
              ],
            },
            {
              OR: [
                { scheduledDate: { gte: from } },
                { dueDate: { gte: from } },
                { deadline: { gte: broadDeadlineFrom } },
              ],
            },
          ],
        },
      ],
    },
  ];

  const priorityNames =
    query.priorities ??
    (query.priority !== undefined ? [query.priority] : undefined);
  const labelIds =
    query.labelIds ??
    (query.labelId !== undefined ? [query.labelId] : undefined);
  const priorityIds = query.priorityIds?.length
    ? [...new Set(query.priorityIds)]
    : undefined;

  if (query.dueFrom !== undefined || query.dueTo !== undefined) {
    and.push({
      dueDate: {
        ...(query.dueFrom !== undefined ? { gte: toDate(query.dueFrom) } : {}),
        ...(query.dueTo !== undefined ? { lte: toDate(query.dueTo) } : {}),
      },
    });
  }
  if (query.hasDueDate !== undefined) {
    and.push({ dueDate: query.hasDueDate ? { not: null } : null });
  }
  if (query.overdue) {
    and.push({ isDone: false, dueDate: { lt: toDate(today) } });
  }
  if (query.recurring !== undefined) {
    and.push(
      query.recurring
        ? { recurrence: { not: 'none' } }
        : { OR: [{ recurrence: 'none' }, { recurrence: null }] }
    );
  }
  if (labelIds !== undefined) {
    if ((query.labelMatch ?? 'any') === 'all') {
      and.push(
        ...labelIds.map((labelId) => ({
          taskLabels: { some: { labelId, label: { userId } } },
        }))
      );
    } else {
      and.push({
        taskLabels: {
          some: { labelId: { in: labelIds }, label: { userId } },
        },
      });
    }
  }

  const completionFilters: Prisma.TaskWhereInput[] = [];
  if (!query.includeCompleted || query.status === 'active') {
    completionFilters.push({ isDone: false });
  }
  if (query.status === 'completed') completionFilters.push({ isDone: true });
  if (query.isDone !== undefined)
    completionFilters.push({ isDone: query.isDone });
  if (query.isArchived === true)
    completionFilters.push({ archivedAt: { not: null } });

  if (query.priorityIds?.length === 0) {
    and.push({ id: -1 });
  }

  return {
    userId,
    deletedAt: null,
    archivedAt: null,
    ...(query.projectId !== undefined ? { projectId: query.projectId } : {}),
    ...(priorityNames !== undefined
      ? {
          priorityLevel: {
            is: { name: { in: priorityNames, mode: 'insensitive' } },
          },
        }
      : {}),
    ...(priorityIds && priorityIds.length > 0
      ? { priorityId: { in: priorityIds } }
      : {}),
    AND: [...and, ...completionFilters],
  };
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
