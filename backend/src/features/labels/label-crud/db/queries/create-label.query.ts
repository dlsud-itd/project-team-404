import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateLabelInput } from '../../types/label-crud.types';

export function createLabel(userId: string, input: CreateLabelInput) {
  return prisma.$transaction(async (transaction) => {
    const lastLabel = await transaction.label.findFirst({
      where: { userId },
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
      select: { sortOrder: true },
    });

    return transaction.label.create({
      data: {
        userId,
        name: input.name,
        color: input.color ?? null,
        sortOrder: (lastLabel?.sortOrder ?? -1) + 1,
      },
    });
  });
}
