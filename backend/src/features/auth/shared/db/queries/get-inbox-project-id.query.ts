import { prisma } from '../../../../../shared/db/prisma.client';

export async function getInboxProjectId(
  userId: string
): Promise<number | null> {
  const project = await prisma.project.findFirst({
    where: { userId, isInbox: true, deletedAt: null },
    select: { id: true },
  });
  return project?.id ?? null;
}
