import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';

type FindOwnedProjectsFilters = {
  isFavorite?: boolean;
  isArchived?: boolean;
  color?: string;
  orderBy?: 'sortOrder' | 'name' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
  limit?: number;
};

export function buildFindOwnedProjectsWhere(
  userId: string,
  filters: FindOwnedProjectsFilters = {}
): Prisma.ProjectWhereInput {
  return {
    userId,
    deletedAt: null,
    isArchived: filters.isArchived ?? false,
    ...(filters.isFavorite !== undefined
      ? { isFavorite: filters.isFavorite }
      : {}),
    ...(filters.color !== undefined
      ? { color: { equals: filters.color, mode: 'insensitive' } }
      : {}),
  };
}

export function buildFindOwnedProjectsOrderBy(
  filters: FindOwnedProjectsFilters = {}
): Prisma.ProjectOrderByWithRelationInput[] {
  return [
    { [filters.orderBy ?? 'sortOrder']: filters.orderDirection ?? 'asc' },
    { id: 'asc' },
  ];
}

export async function findOwnedProjects(
  userId: string,
  filters: FindOwnedProjectsFilters = {}
) {
  const where = buildFindOwnedProjectsWhere(userId, filters);
  const orderBy = buildFindOwnedProjectsOrderBy(filters);

  if (filters.limit === undefined) {
    return prisma.project.findMany({ where, orderBy });
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy, take: filters.limit }),
    prisma.project.count({ where }),
  ]);
  return { projects, total };
}
