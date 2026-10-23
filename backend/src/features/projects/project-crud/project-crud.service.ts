import {
  InboxProjectMutationError,
  ProjectNotFoundError,
} from './errors/project-crud.errors';
import type {
  CreateProjectInput,
  ListProjectsFilters,
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
  ): Promise<ProjectRecord[]>;
  updateOwnedProject(
    projectId: number,
    userId: string,
    input: UpdateProjectInput
  ): Promise<ProjectRecord | null>;
  softDeleteOwnedProject(projectId: number, userId: string): Promise<boolean>;
};

export class ProjectCrudService {
  constructor(private readonly dependencies: ProjectCrudDependencies) {}

  async create(userId: string, input: CreateProjectInput) {
    return toProjectModel(await this.dependencies.createProject(userId, input));
  }

  async list(userId: string, filters: ListProjectsFilters) {
    const projects = await this.dependencies.findOwnedProjects(userId, filters);
    return projects.map(toProjectModel);
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

  async delete(project: ProjectRecord, userId: string): Promise<void> {
    if (project.isInbox) {
      throw new InboxProjectMutationError();
    }
    const deleted = await this.dependencies.softDeleteOwnedProject(
      project.id,
      userId
    );
    if (!deleted) {
      throw new ProjectNotFoundError();
    }
  }
}
