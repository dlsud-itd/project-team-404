import { prisma } from '../../../../../shared/db/prisma.client';

export async function findProfileByUserId(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      username: true,
      timezone: true,
    },
  });
}
