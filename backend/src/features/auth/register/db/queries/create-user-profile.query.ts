import { prisma } from '../../../../../shared/db/prisma.client';

export async function createUserProfile(input: {
  userId: string;
  username: string;
  email: string;
  timezone: string;
}): Promise<void> {
  await prisma.user.create({
    data: {
      id: input.userId,
      username: input.username,
      email: input.email,
      timezone: input.timezone,
    },
  });
}
