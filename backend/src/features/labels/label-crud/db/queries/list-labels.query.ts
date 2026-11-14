import { prisma } from '../../../../../shared/db/prisma.client';

export function listLabels(userId: string, isArchived = false) {
  return prisma.label.findMany({
    where: {
      userId,
      archivedAt: isArchived ? { not: null } : null,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      _count: {
        select: {
          taskLabels: {
            where: { task: { deletedAt: null } },
          },
        },
      },
    },
  });
}
