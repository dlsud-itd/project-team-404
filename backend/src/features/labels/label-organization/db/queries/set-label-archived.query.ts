import { prisma } from '../../../../../shared/db/prisma.client';

const labelCount = {
  _count: {
    select: {
      taskLabels: {
        where: { task: { deletedAt: null } },
      },
    },
  },
} as const;

export async function setLabelArchived(
  labelId: number,
  userId: string,
  isArchived: boolean
) {
  const updated = await prisma.label.updateMany({
    where: {
      id: labelId,
      userId,
      archivedAt: isArchived ? null : { not: null },
    },
    data: { archivedAt: isArchived ? new Date() : null },
  });

  const label = await prisma.label.findFirst({
    where: { id: labelId, userId },
    include: labelCount,
  });
  if (
    !label ||
    (updated.count === 0 && (label.archivedAt !== null) !== isArchived)
  ) {
    return null;
  }
  return label;
}
