import { prisma } from '../../../../../shared/db/prisma.client';

export async function softDeleteOwnedProject(
  projectId: number,
  userId: string
): Promise<boolean> {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, deletedAt: null, isInbox: false },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  return result.count > 0;
}
