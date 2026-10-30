import { prisma } from '../../../../../shared/db/prisma.client';

export async function deleteLabel(labelId: number, userId: string) {
  const result = await prisma.label.deleteMany({
    where: { id: labelId, userId },
  });
  return result.count > 0;
}
