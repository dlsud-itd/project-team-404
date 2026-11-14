import type { z } from 'zod';
import type { Label } from '../../labels/shared/models/label.model';
import type { Project } from '../../projects/shared/models/project.model';
import type { Task } from '../../tasks/shared/models/task.model';
import type { archiveQueryValidator } from '../validators/archive-query.validator';

export type ArchiveItemType = 'tasks' | 'projects' | 'labels';
export type ArchiveCursor = {
  type: ArchiveItemType;
  id: number;
  archivedAt: string;
};
export type ArchiveQuery = z.infer<typeof archiveQueryValidator>;

export type ArchivePage<T> = {
  items: T[];
  total: number;
};

export type ArchiveResponse = {
  tasks: { items: Task[]; total: number };
  projects: { items: Project[]; total: number };
  labels: { items: Label[]; total: number };
  nextCursor: string | null;
};
