import { prisma } from '../../../../../shared/db/prisma.client';

export async function findInboxProject(userId: string) {
  return prisma.project.findFirst({
    where: { userId, isInbox: true, deletedAt: null },
    select: { id: true },
  });
}
