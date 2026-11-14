import { describe, expect, it, vi } from 'vitest';
import type { LabelListRecord } from '../labels/shared/models/label.model';
import type { ProjectRecord } from '../projects/shared/models/project.model';
import type { TaskRecord } from '../tasks/shared/models/task.model';
import { decodeArchiveCursor } from './utils/archive-cursor';
import { ArchiveService } from './archive.service';
import type { ArchiveDependencies } from './archive.service';

const latestTask: TaskRecord = {
  id: 7,
  userId: 'user-1',
  projectId: 18,
  title: 'Archived task',
  description: null,
  priorityId: 1,
  scheduledDate: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  isDone: false,
  doneAt: null,
  archivedAt: new Date('2026-11-10T09:30:00.000Z'),
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: {
    id: 1,
    userId: 'user-1',
    name: 'Medium',
    color: '#888888',
    isDefault: true,
    sortOrder: 1,
    deletedAt: null,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  },
  taskLabels: [],
};
const archivedProject: ProjectRecord = {
  id: 18,
  userId: 'user-1',
  name: 'Archived project',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: true,
  archivedAt: new Date('2026-11-09T09:30:00.000Z'),
  sortOrder: 1,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  deletedAt: null,
};
const archivedLabel: LabelListRecord = {
  id: 4,
  userId: 'user-1',
  name: 'Archived label',
  color: '#54A6A1',
  sortOrder: 1,
  archivedAt: new Date('2026-11-08T09:30:00.000Z'),
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  _count: { taskLabels: 3 },
};

function dependencies(): ArchiveDependencies {
  return {
    listArchivedTasks: vi.fn().mockResolvedValue({
      items: [latestTask],
      total: 4,
    }),
    listArchivedProjects: vi.fn().mockResolvedValue({
      items: [archivedProject],
      total: 2,
    }),
    listArchivedLabels: vi.fn().mockResolvedValue({
      items: [archivedLabel],
      total: 3,
    }),
  };
}

describe('ArchiveService', () => {
  it('merges item types into one stable page and returns per-type totals', async () => {
    const deps = dependencies();
    const service = new ArchiveService(deps);

    const response = await service.list('user-1', {
      type: 'all',
      limit: 2,
    });

    expect(response.tasks.items.map(({ id }) => id)).toEqual([7]);
    expect(response.projects.items.map(({ id }) => id)).toEqual([18]);
    expect(response.labels.items).toEqual([]);
    expect(response.tasks.total).toBe(4);
    expect(response.projects.total).toBe(2);
    expect(response.labels.total).toBe(3);
    expect(decodeArchiveCursor(response.nextCursor!)?.type).toBe('projects');
  });

  it('only queries the requested type and zeros the other group totals', async () => {
    const deps = dependencies();
    const service = new ArchiveService(deps);

    const response = await service.list('user-1', {
      type: 'labels',
      limit: 20,
    });

    expect(deps.listArchivedTasks).not.toHaveBeenCalled();
    expect(deps.listArchivedProjects).not.toHaveBeenCalled();
    expect(deps.listArchivedLabels).toHaveBeenCalledOnce();
    expect(response.tasks).toEqual({ items: [], total: 0 });
    expect(response.projects).toEqual({ items: [], total: 0 });
    expect(response.labels).toMatchObject({
      total: 3,
      items: [{ id: 4, taskCount: 3, isArchived: true }],
    });
  });
});
