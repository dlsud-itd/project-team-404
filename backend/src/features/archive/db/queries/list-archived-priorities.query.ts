import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/db/prisma.client';
import { buildArchiveCursorConditions } from '../../utils/archive-cursor';
import type { ArchiveCursor, ArchivePage } from '../../types/archive.types';
import type { PriorityRecord } from '../../../priorities/priority-crud/models/priority.model';

export async function listArchivedPriorities(
  userId: string,
  limit: number,
  cursor?: ArchiveCursor
): Promise<ArchivePage<PriorityRecord>> {
  const where: Prisma.PriorityLevelWhereInput = {
    userId,
    deletedAt: null,
    archivedAt: { not: null },
  };
  const pageWhere: Prisma.PriorityLevelWhereInput = cursor
    ? {
        ...where,
        OR: buildArchiveCursorConditions('priorities', cursor),
      }
    : where;
  const [items, total] = await Promise.all([
    prisma.priorityLevel.findMany({
      where: pageWhere,
      orderBy: [{ archivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.priorityLevel.count({ where }),
  ]);
  return { items, total };
}
