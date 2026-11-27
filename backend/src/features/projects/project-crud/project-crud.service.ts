import {
  InboxProjectMutationError,
  ProjectLimitReachedError,
  ProjectNotFoundError,
} from './errors/project-crud.errors';
import { MAX_ACTIVE_PROJECTS } from '../shared/project-limit';
import type {
  CreateProjectInput,
  ListProjectsFilters,
  ListProjectsResult,
  UpdateProjectInput,
} from './project-crud.types';
import type { ProjectRecord } from '../shared/models/project.model';
import { toProjectModel } from '../shared/models/project.model';

export type ProjectCrudDependencies = {
  countActiveProjects(userId: string): Promise<number>;
  createProject(
    userId: string,
    input: CreateProjectInput
  ): Promise<ProjectRecord>;
  findOwnedProjects(
    userId: string,
    filters: ListProjectsFilters
  ): Promise<ListProjectsResult>;
  updateOwnedProject(
    projectId: number,
    userId: string,
    input: UpdateProjectInput
  ): Promise<ProjectRecord | null>;
  softDeleteOwnedProject(
    projectId: number,
    userId: string
  ): Promise<number | null>;
};

export class ProjectCrudService {
  constructor(private readonly dependencies: ProjectCrudDependencies) {}

  async create(userId: string, input: CreateProjectInput) {
    // Count, then create: not atomic, so two requests at the same instant could both pass at 9.
    // The form disables its button while saving, which is enough for this limit.
    const active = await this.dependencies.countActiveProjects(userId);
    if (active >= MAX_ACTIVE_PROJECTS) {
      throw new ProjectLimitReachedError(MAX_ACTIVE_PROJECTS);
    }
    return toProjectModel(await this.dependencies.createProject(userId, input));
  }

  async list(userId: string, filters: ListProjectsFilters) {
    const result = await this.dependencies.findOwnedProjects(userId, filters);
    if (Array.isArray(result)) {
      return result.map(toProjectModel);
    }
    return {
      projects: result.projects.map(toProjectModel),
      total: result.total,
    };
  }

  async update(
    project: ProjectRecord,
    userId: string,
    input: UpdateProjectInput
  ) {
    if (project.isInbox) {
      throw new InboxProjectMutationError();
    }
    const updated = await this.dependencies.updateOwnedProject(
      project.id,
      userId,
      input
    );
    if (!updated) {
      throw new ProjectNotFoundError();
    }
    return toProjectModel(updated);
  }

  async delete(project: ProjectRecord, userId: string): Promise<number> {
    if (project.isInbox) {
      throw new InboxProjectMutationError();
    }
    const movedTaskCount = await this.dependencies.softDeleteOwnedProject(
      project.id,
      userId
    );
    if (movedTaskCount === null) {
      throw new ProjectNotFoundError();
    }
    return movedTaskCount;
  }
}
