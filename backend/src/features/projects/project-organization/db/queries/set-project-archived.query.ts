import { prisma } from '../../../../../shared/db/prisma.client';

export async function setProjectArchived(
  projectId: number,
  userId: string,
  isArchived: boolean
) {
  const updatedAt = new Date();
  const updated = await prisma.project.updateMany({
    where: {
      id: projectId,
      userId,
      deletedAt: null,
      isArchived: !isArchived,
      ...(isArchived ? { isInbox: false } : {}),
    },
    data: {
      isArchived,
      archivedAt: isArchived ? updatedAt : null,
      updatedAt,
    },
  });

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });
  if (!project || (updated.count === 0 && project.isArchived !== isArchived)) {
    return null;
  }
  return project;
}
