import { prisma } from '../../../../../shared/db/prisma.client';

export async function createResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.passwordResetToken.create({ data: input });
}
