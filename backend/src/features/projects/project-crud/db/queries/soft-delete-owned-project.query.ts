import { prisma } from '../../../../../shared/db/prisma.client';

export async function softDeleteOwnedProject(
  projectId: number,
  userId: string
): Promise<number | null> {
  return prisma.$transaction(async (transaction) => {
    const updatedAt = new Date();
    const result = await transaction.project.updateMany({
      where: { id: projectId, userId, deletedAt: null, isInbox: false },
      data: { deletedAt: updatedAt, updatedAt },
    });
    if (result.count === 0) {
      return null;
    }

    const inbox = await transaction.project.findFirst({
      where: { userId, isInbox: true, deletedAt: null },
      select: { id: true },
    });
    if (!inbox) {
      throw new Error('Inbox project not found for owner');
    }

    const movedTasks = await transaction.task.updateMany({
      where: { projectId, userId, deletedAt: null },
      data: { projectId: inbox.id, updatedAt },
    });
    return movedTasks.count;
  });
}
