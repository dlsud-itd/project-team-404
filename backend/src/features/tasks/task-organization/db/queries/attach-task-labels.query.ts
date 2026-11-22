import { prisma } from '../../../../../shared/db/prisma.client';

export async function attachTaskLabels(
  taskId: number,
  labelIds: number[],
  userId: string
) {
  await prisma.taskLabel.createMany({
    data: labelIds.map((labelId) => ({ taskId, labelId })),
    skipDuplicates: true,
  });
  return listTaskLabels(taskId, userId);
}

export function listTaskLabels(taskId: number, userId: string) {
  return prisma.taskLabel
    .findMany({
      where: { taskId, label: { userId } },
      include: { label: true },
      orderBy: [{ label: { name: 'asc' } }, { labelId: 'asc' }],
    })
    .then((links) => links.map(({ label }) => label));
}
