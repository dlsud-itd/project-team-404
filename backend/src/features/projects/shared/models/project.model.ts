import type { Project as PrismaProject } from '@prisma/client';

export type ProjectRecord = PrismaProject;
export type Project = Omit<ProjectRecord, 'userId' | 'deletedAt'>;

export function toProjectModel(project: ProjectRecord): Project {
  const {
    id,
    name,
    description,
    color,
    isInbox,
    isFavorite,
    isArchived,
    sortOrder,
    createdAt,
    updatedAt,
  } = project;
  return {
    id,
    name,
    description,
    color,
    isInbox,
    isFavorite,
    isArchived,
    sortOrder,
    createdAt,
    updatedAt,
  };
}
