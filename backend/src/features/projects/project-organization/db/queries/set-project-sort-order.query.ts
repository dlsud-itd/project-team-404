import { prisma } from '../../../../../shared/db/prisma.client';

export async function setProjectSortOrder(
  projectId: number,
  userId: string,
  sortOrder: number
) {
  return prisma.project.updateMany({
    where: { id: projectId, userId, deletedAt: null, isInbox: false },
    data: { sortOrder, updatedAt: new Date() },
  });
}
