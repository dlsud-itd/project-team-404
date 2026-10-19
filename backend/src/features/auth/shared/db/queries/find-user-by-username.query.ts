import { prisma } from '../../../../../shared/db/prisma.client';
import type { UserRecord } from '../../models/user.model';

export async function findUserByUsername(
  username: string
): Promise<UserRecord | null> {
  return prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      deletedAt: true,
    },
  });
}
