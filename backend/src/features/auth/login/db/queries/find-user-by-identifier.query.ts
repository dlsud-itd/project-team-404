import { prisma } from '../../../../../shared/db/prisma.client';

export async function findUserByIdentifier(identifier: string) {
  const normalized = identifier.trim();
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...(normalized.includes('@')
        ? { email: normalized.toLowerCase() }
        : { username: normalized }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      deletedAt: true,
    },
  });
}
