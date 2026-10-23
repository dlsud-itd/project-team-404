import { prisma } from '../../../../../shared/db/prisma.client';
import { ProjectNotFoundError } from '../../../project-crud/errors/project-crud.errors';
import { reorderProjects } from '../../utils/reorder-projects.util';

export async function updateProjectSortOrders(
  projectIds: number[],
  userId: string
) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.project.findMany({
      where: { userId, deletedAt: null, isInbox: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const ownedProjectIds = new Set(existing.map((project) => project.id));
    const requestedIds = new Set(projectIds);

    if (projectIds.some((id) => !ownedProjectIds.has(id))) {
      throw new ProjectNotFoundError();
    }

    const orderedIds = [
      ...projectIds,
      ...existing
        .map((project) => project.id)
        .filter((projectId) => !requestedIds.has(projectId)),
    ];
    const sortOrders = reorderProjects(orderedIds);

    for (const { projectId, sortOrder } of sortOrders) {
      const result = await transaction.project.updateMany({
        where: { id: projectId, userId, deletedAt: null, isInbox: false },
        data: { sortOrder, updatedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new ProjectNotFoundError();
      }
    }

    return sortOrders;
  });
}
