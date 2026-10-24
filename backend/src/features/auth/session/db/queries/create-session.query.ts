import { prisma } from '../../../../../shared/db/prisma.client';

export async function createSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.session.create({ data: input });
}
