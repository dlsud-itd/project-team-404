import { prisma } from '../../../../../shared/db/prisma.client';

export async function isUsernameAvailable(username: string): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: { username, deletedAt: null },
    })) === 0
  );
}
