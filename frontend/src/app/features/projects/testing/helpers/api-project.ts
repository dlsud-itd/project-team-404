import type { ApiProject, Project } from '../../shared/types/project.types';

/** The response body the backend would send for `project`, for flushing in specs. */
export function apiProject({ projectId, ...rest }: Project): ApiProject {
  return { id: projectId, ...rest };
}
