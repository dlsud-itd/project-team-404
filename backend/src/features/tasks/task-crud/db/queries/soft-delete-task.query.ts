import { prisma } from '../../../../../shared/db/prisma.client';

export async function softDeleteTask(taskId: number, userId: string) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}
