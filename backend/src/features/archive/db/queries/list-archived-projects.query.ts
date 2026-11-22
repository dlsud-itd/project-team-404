import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/db/prisma.client';
import { buildArchiveCursorConditions } from '../../utils/archive-cursor';
import type { ArchiveCursor, ArchivePage } from '../../types/archive.types';
import type { ProjectRecord } from '../../../projects/shared/models/project.model';

export async function listArchivedProjects(
  userId: string,
  limit: number,
  cursor?: ArchiveCursor
): Promise<ArchivePage<ProjectRecord>> {
  const where: Prisma.ProjectWhereInput = {
    userId,
    deletedAt: null,
    isArchived: true,
    archivedAt: { not: null },
  };
  const pageWhere: Prisma.ProjectWhereInput = cursor
    ? {
        ...where,
        OR: buildArchiveCursorConditions('projects', cursor),
      }
    : where;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where: pageWhere,
      orderBy: [{ archivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
    prisma.project.count({ where }),
  ]);
  return { items, total };
}
