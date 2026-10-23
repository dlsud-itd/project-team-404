import { prisma } from '../../../../../shared/db/prisma.client';

export async function findOwnedProject(projectId: number, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });
}
