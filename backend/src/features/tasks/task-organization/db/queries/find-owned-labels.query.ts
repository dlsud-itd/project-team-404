import { prisma } from '../../../../../shared/db/prisma.client';

export function findOwnedLabels(labelIds: number[], userId: string) {
  return prisma.label.findMany({
    where: { id: { in: labelIds }, userId },
  });
}
