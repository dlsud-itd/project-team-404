import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';
import { getDateWindow } from '../../../../dashboard/shared/utils/date-window.util';
import type { ListTasksFilters } from '../../types/task-crud.types';

const taskInclude = {
  priorityLevel: true,
  taskLabels: { include: { label: true } },
} as const;

export function buildListTasksWhere(
  userId: string,
  filters: ListTasksFilters,
  overdueDate?: string
): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [
    {
      OR: [
        { projectId: null },
        { project: { is: { isArchived: false, deletedAt: null } } },
      ],
    },
  ];
  const priorityNames =
    filters.priorities ??
    (filters.priority !== undefined ? [filters.priority] : undefined);
  const labelIds =
    filters.labelIds ??
    (filters.labelId !== undefined ? [filters.labelId] : undefined);

  if (filters.dueFrom !== undefined || filters.dueTo !== undefined) {
    and.push({
      dueDate: {
        ...(filters.dueFrom !== undefined
          ? { gte: toDate(filters.dueFrom) }
          : {}),
        ...(filters.dueTo !== undefined ? { lte: toDate(filters.dueTo) } : {}),
      },
    });
  }
  if (filters.hasDueDate !== undefined) {
    and.push({
      dueDate: filters.hasDueDate ? { not: null } : null,
    });
  }
  if (filters.overdue) {
    if (overdueDate === undefined) {
      throw new Error(
        'An overdue date is required when filtering overdue tasks'
      );
    }
    and.push({
      isDone: false,
      dueDate: { lt: toDate(overdueDate) },
    });
  }
  if (filters.recurring !== undefined) {
    and.push(
      filters.recurring
        ? { recurrence: { not: 'none' } }
        : { OR: [{ recurrence: 'none' }, { recurrence: null }] }
    );
  }
  if (labelIds !== undefined) {
    if ((filters.labelMatch ?? 'any') === 'all') {
      and.push(
        ...labelIds.map((labelId) => ({
          taskLabels: {
            some: { labelId, label: { userId } },
          },
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

  return {
    userId,
    deletedAt: null,
    ...(filters.projectId !== undefined
      ? { projectId: filters.projectId }
      : {}),
    ...(filters.status === 'active' ? { isDone: false } : {}),
    ...(filters.status === 'completed' ? { isDone: true } : {}),
    ...(filters.isDone !== undefined ? { isDone: filters.isDone } : {}),
    ...(priorityNames !== undefined
      ? {
          priorityLevel: {
            is: {
              name: { in: priorityNames, mode: 'insensitive' },
            },
          },
        }
      : {}),
    AND: and,
  };
}

export function buildListTasksOrderBy(
  filters: Pick<ListTasksFilters, 'orderBy' | 'orderDirection'>
): Prisma.TaskOrderByWithRelationInput[] {
  const orderBy = filters.orderBy ?? 'createdAt';
  const direction = filters.orderDirection;

  if (orderBy === 'priority') {
    return [{ priorityLevel: { sortOrder: direction } }, { id: 'asc' }];
  }
  if (
    orderBy === 'dueDate' ||
    orderBy === 'deadline' ||
    orderBy === 'scheduledDate'
  ) {
    return [{ [orderBy]: { sort: direction, nulls: 'last' } }, { id: 'asc' }];
  }
  return [{ [orderBy]: direction }, { id: 'asc' }];
}

export async function listTasks(userId: string, filters: ListTasksFilters) {
  const overdueDate =
    filters.overdue === true ? await getUserToday(userId) : undefined;

  return prisma.task.findMany({
    where: buildListTasksWhere(userId, filters, overdueDate),
    orderBy: buildListTasksOrderBy(filters),
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
    include: taskInclude,
  });
}

async function getUserToday(userId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return getDateWindow(owner?.timezone ?? 'UTC', 0).startDate;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
