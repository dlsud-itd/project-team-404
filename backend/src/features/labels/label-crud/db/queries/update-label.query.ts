import { prisma } from '../../../../../shared/db/prisma.client';
import type { UpdateLabelInput } from '../../types/label-crud.types';

export async function updateLabel(
  labelId: number,
  userId: string,
  input: UpdateLabelInput
) {
  const updated = await prisma.label.updateMany({
    where: { id: labelId, userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
  if (updated.count === 0) {
    return null;
  }
  return prisma.label.findFirst({ where: { id: labelId, userId } });
}
