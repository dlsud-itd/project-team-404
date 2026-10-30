import { prisma } from '../../../../../shared/db/prisma.client';

export function detachTaskLabel(
  taskId: number,
  labelId: number,
  userId: string
) {
  return prisma.taskLabel.deleteMany({
    where: { taskId, labelId, label: { userId } },
  });
}
