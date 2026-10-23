import { ProjectNotFoundError } from '../project-crud/errors/project-crud.errors';
import type { ProjectRecord } from '../shared/models/project.model';
import { InboxCannotBeArchivedError } from './errors/inbox-cannot-be-archived.error';
import type { ProjectSortOrder } from './project-organization.types';

export type ProjectOrganizationDependencies = {
  setProjectFavorite(
    projectId: number,
    userId: string,
    isFavorite: boolean
  ): Promise<{ count: number }>;
  setProjectArchived(
    projectId: number,
    userId: string,
    isArchived: boolean
  ): Promise<{ count: number }>;
  setProjectSortOrder(
    projectId: number,
    userId: string,
    sortOrder: number
  ): Promise<{ count: number }>;
  updateProjectSortOrders(
    projectIds: number[],
    userId: string
  ): Promise<ProjectSortOrder[]>;
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
    const result = await this.dependencies.setProjectArchived(
      project.id,
      userId,
      isArchived
    );
    if (result.count !== 1) throw new ProjectNotFoundError();
    return {
      projectId: project.id,
      isArchived,
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

  reorder(projectIds: number[], userId: string) {
    return this.dependencies.updateProjectSortOrders(projectIds, userId);
  }
}
