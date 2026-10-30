import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateLabelInput } from '../../types/label-crud.types';

export function createLabel(userId: string, input: CreateLabelInput) {
  return prisma.label.create({
    data: {
      userId,
      name: input.name,
      color: input.color ?? null,
    },
  });
}
