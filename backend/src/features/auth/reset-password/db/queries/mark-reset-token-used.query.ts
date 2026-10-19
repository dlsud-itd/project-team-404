import { prisma } from '../../../../../shared/db/prisma.client';

export async function markResetTokenUsed(
  tokenHash: string,
  now = new Date()
): Promise<boolean> {
  const result = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return result.count === 1;
}
