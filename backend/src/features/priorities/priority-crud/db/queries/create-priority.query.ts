import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreatePriorityInput } from '../../types/priority-crud.types';

export async function createPriority(
  userId: string,
  input: CreatePriorityInput
) {
  const lastLevel = await prisma.priorityLevel.findFirst({
    where: { userId },
    orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
    select: { sortOrder: true },
  });

  return prisma.priorityLevel.create({
    data: {
      userId,
      name: input.name.trim(),
      color: input.color?.trim() || null,
      sortOrder: (lastLevel?.sortOrder ?? 0) + 1,
      isDefault: false,
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });
}
