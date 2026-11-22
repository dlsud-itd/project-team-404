import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/db/prisma.client';
import { buildArchiveCursorConditions } from '../../utils/archive-cursor';
import type { ArchiveCursor } from '../../types/archive.types';
import type { TaskRecord } from '../../../tasks/shared/models/task.model';
import type { ArchivePage } from '../../types/archive.types';

const taskInclude = {
  priorityLevel: true,
  taskLabels: { include: { label: true } },
} as const;

export async function listArchivedTasks(
  userId: string,
  limit: number,
  cursor?: ArchiveCursor
): Promise<ArchivePage<TaskRecord>> {
  const activeProjectCondition: Prisma.TaskWhereInput = {
    OR: [{ projectId: null }, { project: { is: { deletedAt: null } } }],
  };
  const where: Prisma.TaskWhereInput = {
    userId,
    deletedAt: null,
    archivedAt: { not: null },
    AND: [activeProjectCondition],
  };
  const pageWhere: Prisma.TaskWhereInput = cursor
    ? {
        ...where,
        AND: [
          activeProjectCondition,
          { OR: buildArchiveCursorConditions('tasks', cursor) },
        ],
      }
    : where;
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where: pageWhere,
      orderBy: [{ archivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: taskInclude,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total };
}
