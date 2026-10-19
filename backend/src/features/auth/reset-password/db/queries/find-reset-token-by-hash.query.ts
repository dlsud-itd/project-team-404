import { prisma } from '../../../../../shared/db/prisma.client';

export async function findResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, usedAt: true },
  });
}
