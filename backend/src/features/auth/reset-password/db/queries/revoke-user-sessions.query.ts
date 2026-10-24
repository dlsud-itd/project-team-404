import { prisma } from '../../../../../shared/db/prisma.client';

export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
