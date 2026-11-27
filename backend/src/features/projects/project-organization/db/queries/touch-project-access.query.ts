import { prisma } from '../../../../../shared/db/prisma.client';

/**
 * Records that the user opened a project, for the dashboard's "Recently accessed" sort.
 * updatedAt is left alone: opening a project doesn't change it.
 */
export async function touchProjectAccess(
  projectId: number,
  userId: string,
  at: Date
) {
  return prisma.project.updateMany({
    where: { id: projectId, userId, deletedAt: null },
    data: { lastAccessedAt: at },
  });
}
