import { prisma } from '../../../../../shared/db/prisma.client';

export async function revokeSession(tokenHash: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
