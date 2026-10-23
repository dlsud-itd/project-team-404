import type { z } from 'zod';
import type { createProjectValidator } from './validators/create-project.validator';
import type { updateProjectValidator } from './validators/update-project.validator';
import type { listProjectsQueryValidator } from './validators/list-projects-query.validator';

export type CreateProjectInput = z.infer<typeof createProjectValidator>;
export type UpdateProjectInput = z.infer<typeof updateProjectValidator>;
export type ListProjectsFilters = z.infer<typeof listProjectsQueryValidator>;
