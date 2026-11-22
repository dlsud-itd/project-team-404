import { prisma } from '../../../../../shared/db/prisma.client';
import type { UpdatePriorityInput } from '../../types/priority-crud.types';

export async function updatePriority(
  priorityId: number,
  userId: string,
  input: UpdatePriorityInput
) {
  const existing = await prisma.priorityLevel.findFirst({
    where: { id: priorityId, userId, deletedAt: null },
  });
  if (!existing) return null;

  return prisma.priorityLevel.update({
    where: { id: priorityId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined
        ? { color: input.color?.trim() || null }
        : {}),
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });
}
