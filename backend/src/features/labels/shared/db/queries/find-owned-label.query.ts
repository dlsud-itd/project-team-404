import { prisma } from '../../../../../shared/db/prisma.client';

export function findOwnedLabel(labelId: number, userId: string) {
  return prisma.label.findFirst({
    where: { id: labelId, userId },
  });
}
