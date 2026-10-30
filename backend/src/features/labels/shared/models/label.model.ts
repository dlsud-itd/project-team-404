import type { Label as PrismaLabel } from '@prisma/client';

export type LabelRecord = PrismaLabel;
export type Label = Omit<LabelRecord, 'userId'> & { color: string | null };

export function toLabelModel(label: LabelRecord): Label {
  return {
    id: label.id,
    name: label.name,
    color: label.color?.trim() || null,
    createdAt: new Date(label.createdAt),
    updatedAt: new Date(label.updatedAt),
  };
}
