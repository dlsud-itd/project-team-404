import type { Prisma } from '@prisma/client';

export async function getNextTaskPosition(
  transaction: Pick<Prisma.TransactionClient, 'task'>,
  userId: string,
  projectId: number | null,
  isDone?: boolean
) {
  const maximum = await transaction.task.aggregate({
    where: {
      userId,
      projectId,
      deletedAt: null,
      archivedAt: null,
      ...(isDone !== undefined ? { isDone } : {}),
    },
    _max: { position: true },
  });
  return (maximum._max.position ?? 0) + 1;
}
