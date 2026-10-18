import { prisma } from '../../../../../shared/db/prisma.client';

export async function invalidateResetTokens(userId: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}
