import { prisma } from '../../../../../shared/db/prisma.client';

export async function findMeWithInbox(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      username: true,
      email: true,
      timezone: true,
      projects: {
        where: { isInbox: true, deletedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  const inboxProjectId = user?.projects[0]?.id;
  if (!user || !user.email || !user.timezone || inboxProjectId === undefined) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    timezone: user.timezone,
    inboxProjectId,
  };
}
