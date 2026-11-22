import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/db/prisma.client';
import { buildArchiveCursorConditions } from '../../utils/archive-cursor';
import type { ArchiveCursor, ArchivePage } from '../../types/archive.types';
import type { LabelListRecord } from '../../../labels/shared/models/label.model';

const labelCount = {
  _count: {
    select: {
      taskLabels: {
        where: { task: { deletedAt: null } },
      },
    },
  },
} as const;

export async function listArchivedLabels(
  userId: string,
  limit: number,
  cursor?: ArchiveCursor
): Promise<ArchivePage<LabelListRecord>> {
  const where: Prisma.LabelWhereInput = {
    userId,
    archivedAt: { not: null },
  };
  const pageWhere: Prisma.LabelWhereInput = cursor
    ? {
        ...where,
        OR: buildArchiveCursorConditions('labels', cursor),
      }
    : where;
  const [items, total] = await Promise.all([
    prisma.label.findMany({
      where: pageWhere,
      orderBy: [{ archivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: labelCount,
    }),
    prisma.label.count({ where }),
  ]);
  return { items, total };
}
