import { prisma } from '../../../../../shared/db/prisma.client';

export function listLabels(userId: string) {
  return prisma.label.findMany({
    where: { userId },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}
