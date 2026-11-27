import type { Prisma } from '@prisma/client';

export type PriorityRecord = Prisma.PriorityLevelGetPayload<{
  include: {
    _count: { select: { tasks: true } };
  };
}>;

export type PriorityModel = {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
  /** Archived levels stay listed so tasks that use them still show their color. */
  isArchived: boolean;
  archivedAt: Date | null;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toPriorityModel(record: PriorityRecord): PriorityModel {
  return {
    id: record.id,
    name: record.name,
    color: record.color?.trim() || null,
    sortOrder: record.sortOrder,
    isDefault: record.isDefault,
    isArchived: record.archivedAt !== null,
    archivedAt: record.archivedAt ? new Date(record.archivedAt) : null,
    taskCount: record._count.tasks,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
