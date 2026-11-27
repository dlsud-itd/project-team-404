import {
  ProjectLimitReachedError,
  ProjectNotFoundError,
} from '../project-crud/errors/project-crud.errors';
import { MAX_ACTIVE_PROJECTS } from '../shared/project-limit';
import type { ProjectRecord } from '../shared/models/project.model';
import { InboxCannotBeArchivedError } from './errors/inbox-cannot-be-archived.error';
import type { ProjectSortOrder } from './project-organization.types';

export type ProjectOrganizationDependencies = {
  countActiveProjects(userId: string): Promise<number>;
  setProjectFavorite(
    projectId: number,
    userId: string,
    isFavorite: boolean
  ): Promise<{ count: number }>;
  setProjectArchived(
    projectId: number,
    userId: string,
    isArchived: boolean
  ): Promise<ProjectRecord | null>;
  setProjectSortOrder(
    projectId: number,
    userId: string,
    sortOrder: number
  ): Promise<{ count: number }>;
  updateProjectSortOrders(
    projectIds: number[],
    userId: string
  ): Promise<ProjectSortOrder[]>;
  touchProjectAccess?(
    projectId: number,
    userId: string,
    at: Date
  ): Promise<{ count: number }>;
};

export class ProjectOrganizationService {
  constructor(private readonly dependencies: ProjectOrganizationDependencies) {}

  async setFavorite(
    project: ProjectRecord,
    userId: string,
    isFavorite: boolean
  ) {
    const result = await this.dependencies.setProjectFavorite(
      project.id,
      userId,
      isFavorite
    );
    if (result.count !== 1) throw new ProjectNotFoundError();
    return {
      projectId: project.id,
      isFavorite,
      message: isFavorite
        ? 'Project added to favorites'
        : 'Project removed from favorites',
    };
  }

  async setArchived(
    project: ProjectRecord,
    userId: string,
    isArchived: boolean
  ) {
    if (project.isInbox && isArchived) {
      throw new InboxCannotBeArchivedError();
    }
    // Restoring brings a project back into the active count; archiving only frees a slot.
    if (!isArchived && project.isArchived && !project.isInbox) {
      const active = await this.dependencies.countActiveProjects(userId);
      if (active >= MAX_ACTIVE_PROJECTS) {
        throw new ProjectLimitReachedError(MAX_ACTIVE_PROJECTS);
      }
    }
    const updated = await this.dependencies.setProjectArchived(
      project.id,
      userId,
      isArchived
    );
    if (!updated) throw new ProjectNotFoundError();
    return {
      projectId: project.id,
      isArchived: updated.isArchived,
      archivedAt: updated.archivedAt,
      message: isArchived
        ? 'Project archived successfully'
        : 'Project restored from archive',
    };
  }

  async setSortOrder(
    project: ProjectRecord,
    userId: string,
    sortOrder: number
  ) {
    const result = await this.dependencies.setProjectSortOrder(
      project.id,
      userId,
      sortOrder
    );
    if (result.count !== 1) throw new ProjectNotFoundError();
    return {
      projectId: project.id,
      sortOrder,
      message: 'Project sort order updated successfully',
    };
  }

  /** Stamps lastAccessedAt with the current time. */
  async markAccessed(project: ProjectRecord, userId: string) {
    const at = new Date();
    const result = await this.dependencies.touchProjectAccess?.(
      project.id,
      userId,
      at
    );
    if (result && result.count !== 1) throw new ProjectNotFoundError();
    return { projectId: project.id, lastAccessedAt: at };
  }

  reorder(projectIds: number[], userId: string) {
    return this.dependencies.updateProjectSortOrders(projectIds, userId);
  }
}
