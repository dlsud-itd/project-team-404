import type { ProjectSortOrder } from '../project-organization.types';

export function reorderProjects(projectIds: number[]): ProjectSortOrder[] {
  return projectIds.map((projectId, sortOrder) => ({ projectId, sortOrder }));
}
