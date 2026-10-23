import { prisma } from '../../../../../shared/db/prisma.client';

export async function setProjectFavorite(
  projectId: number,
  userId: string,
  isFavorite: boolean
) {
  return prisma.project.updateMany({
    where: { id: projectId, userId, deletedAt: null },
    data: { isFavorite, updatedAt: new Date() },
  });
}
