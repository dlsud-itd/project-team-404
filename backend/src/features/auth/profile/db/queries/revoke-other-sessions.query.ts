import { prisma } from '../../../../../shared/db/prisma.client';

/** Revokes every active session of the user except the one with `keepTokenHash`. */
export async function revokeOtherSessions(
  userId: string,
  keepTokenHash: string
): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, NOT: { tokenHash: keepTokenHash } },
    data: { revokedAt: new Date() },
  });
}
