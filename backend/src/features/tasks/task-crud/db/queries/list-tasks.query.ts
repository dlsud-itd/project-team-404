import { prisma } from '../../../../../shared/db/prisma.client';
import type { ListTasksFilters } from '../../types/task-crud.types';

export async function listTasks(userId: string, filters: ListTasksFilters) {
  return prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(filters.projectId !== undefined
        ? { projectId: filters.projectId }
        : {}),
      ...(filters.status === 'active' ? { isDone: false } : {}),
      ...(filters.status === 'completed' ? { isDone: true } : {}),
      ...(filters.priority !== undefined
        ? { priorityLevel: { name: filters.priority } }
        : {}),
      ...(filters.labelId !== undefined
        ? {
            taskLabels: {
              some: {
                labelId: filters.labelId,
                label: { userId },
              },
            },
          }
        : {}),
    },
    orderBy: resolveOrderBy(filters.orderBy, filters.orderDirection),
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
    include: {
      priorityLevel: true,
      taskLabels: { include: { label: true } },
    },
  });
}

function resolveOrderBy(
  orderBy: ListTasksFilters['orderBy'],
  direction: ListTasksFilters['orderDirection']
) {
  if (orderBy === 'priority') {
    return [
      { priorityLevel: { sortOrder: direction } },
      { id: 'asc' as const },
    ];
  }
  if (orderBy) {
    return [{ [orderBy]: direction }, { id: 'asc' as const }];
  }
  return [
    { dueDate: 'asc' as const },
    { createdAt: 'desc' as const },
    { id: 'asc' as const },
  ];
}
