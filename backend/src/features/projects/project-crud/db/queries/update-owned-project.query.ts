import { prisma } from '../../../../../shared/db/prisma.client';
import type { UpdateProjectInput } from '../../project-crud.types';
import { findOwnedProject } from '../../../shared/db/queries/find-owned-project.query';

export async function updateOwnedProject(
  projectId: number,
  userId: string,
  input: UpdateProjectInput
) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId, deletedAt: null, isInbox: false },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
  if (result.count === 0) {
    return null;
  }
  return findOwnedProject(projectId, userId);
}
