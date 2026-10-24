import { prisma } from '../../../../../shared/db/prisma.client';

export async function isEmailAvailable(email: string): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: { email: email.toLowerCase(), deletedAt: null },
    })) === 0
  );
}
