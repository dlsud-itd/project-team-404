import { prisma } from '../../../../../shared/db/prisma.client';
import type { UserRecord } from '../../models/user.model';

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  return prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      deletedAt: true,
    },
  });
}
