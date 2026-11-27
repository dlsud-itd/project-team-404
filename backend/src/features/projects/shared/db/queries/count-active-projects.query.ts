import { prisma } from '../../../../../shared/db/prisma.client';

/** The user's projects that count toward MAX_ACTIVE_PROJECTS: not archived, deleted or the Inbox. */
export function countActiveProjects(userId: string): Promise<number> {
  return prisma.project.count({
    where: { userId, deletedAt: null, isArchived: false, isInbox: false },
  });
}
