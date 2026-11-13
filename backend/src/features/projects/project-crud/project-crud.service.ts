import {
  InboxProjectMutationError,
  ProjectNotFoundError,
} from './errors/project-crud.errors';
import type {
  CreateProjectInput,
  ListProjectsFilters,
  ListProjectsResult,
  UpdateProjectInput,
} from './project-crud.types';
import type { ProjectRecord } from '../shared/models/project.model';
import { toProjectModel } from '../shared/models/project.model';

export type ProjectCrudDependencies = {
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
