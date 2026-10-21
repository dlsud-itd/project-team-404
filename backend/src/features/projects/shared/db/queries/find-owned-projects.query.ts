import { prisma } from '../../../../../shared/db/prisma.client';

export async function findOwnedProjects(
  userId: string,
  filters: { isArchived?: boolean } = {}
) {
  return prisma.project.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(filters.isArchived !== undefined
        ? { isArchived: filters.isArchived }
        : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
}
