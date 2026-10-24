import { prisma } from '../../../../../shared/db/prisma.client';

export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
}
