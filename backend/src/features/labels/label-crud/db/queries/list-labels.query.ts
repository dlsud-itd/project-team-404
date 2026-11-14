import { prisma } from '../../../../../shared/db/prisma.client';

export function listLabels(userId: string) {
  return prisma.label.findMany({
    where: { userId },
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
