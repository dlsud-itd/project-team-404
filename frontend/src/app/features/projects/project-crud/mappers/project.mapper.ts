import type { ApiProject, Project } from '../../shared/types/project.types';

/** Turns a project from the API into the shape the app uses (`id` becomes `projectId`). */
export function toProject(project: ApiProject): Project {
  return {
    projectId: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    isInbox: project.isInbox,
    isFavorite: project.isFavorite,
    isArchived: project.isArchived,
    sortOrder: project.sortOrder,
  };
}
