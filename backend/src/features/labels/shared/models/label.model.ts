import type { Label as PrismaLabel } from '@prisma/client';

export type LabelRecord = PrismaLabel;
export type LabelListRecord = LabelRecord & {
  _count: {
    taskLabels: number;
  };
};
export type Label = Omit<LabelRecord, 'userId'> & {
  color: string | null;
  sortOrder: number;
  isArchived: boolean;
  taskCount?: number;
};

export function toLabelModel(label: LabelRecord, taskCount?: number): Label {
  return {
    id: label.id,
    name: label.name,
    color: label.color?.trim() || null,
    sortOrder: label.sortOrder,
    isArchived: label.archivedAt !== null,
    archivedAt: label.archivedAt ? new Date(label.archivedAt) : null,
    ...(taskCount !== undefined ? { taskCount } : {}),
    createdAt: new Date(label.createdAt),
    updatedAt: new Date(label.updatedAt),
  };
}
