import { prisma } from '../../../../../shared/db/prisma.client';

export async function findUserTimezone(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { timezone: true },
  });
  return user?.timezone ?? null;
}
