import { prisma } from '../../../../../shared/db/prisma.client';

export async function updateProfileByUserId(
  userId: string,
  data: { username?: string; timezone?: string }
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      username: true,
      timezone: true,
    },
  });
}
