import { prisma } from '../../../../../shared/db/prisma.client';

export async function setProjectArchived(
  projectId: number,
  userId: string,
  isArchived: boolean
) {
  return prisma.project.updateMany({
    where: {
      id: projectId,
      userId,
      deletedAt: null,
      ...(isArchived ? { isInbox: false } : {}),
    },
    data: { isArchived, updatedAt: new Date() },
  });
}
