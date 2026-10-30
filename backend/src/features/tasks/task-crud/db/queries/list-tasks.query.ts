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
      ...(filters.priority !== undefined ? { priority: filters.priority } : {}),
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
  });
}
