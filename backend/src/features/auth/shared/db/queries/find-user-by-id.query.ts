import { prisma } from '../../../../../shared/db/prisma.client';
import type { UserRecord } from '../../models/user.model';

export async function findUserById(userId: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      deletedAt: true,
    },
  });
}
