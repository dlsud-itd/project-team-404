import { describe, expect, it, vi } from 'vitest';
import type { TaskRecord } from '../../tasks/shared/models/task.model';
import { OverdueTasksService } from './overdue-tasks.service';

const task: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  position: 1,
  title: 'Review sprint plan',
  description: null,
  priorityId: 2,
  scheduledDate: null,
  dueDate: new Date('2026-11-04T00:00:00.000Z'),
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  isDone: false,
  doneAt: null,
  archivedAt: null,
  createdAt: new Date('2026-11-05T00:00:00.000Z'),
  updatedAt: new Date('2026-11-05T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: {
    id: 2,
    userId: 'owner-1',
    name: 'medium',
    color: '#a3a3a3',
    isDefault: true,
    archivedAt: null,
    sortOrder: 2,
    deletedAt: null,
    createdAt: new Date('2026-10-30T00:00:00.000Z'),
    updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  },
  taskLabels: [],
};

describe('OverdueTasksService', () => {
  it('passes the start of today in the caller timezone, then maps results', async () => {
    const now = new Date('2026-11-05T16:30:00.000Z');
    const dependencies = {
      findUserTimezone: vi.fn().mockResolvedValue('Asia/Manila'),
      listOverdueTasks: vi.fn().mockResolvedValue([task]),
    };
    const service = new OverdueTasksService(dependencies, () => now);

    const result = await service.list('owner-1');

    expect(dependencies.findUserTimezone).toHaveBeenCalledWith('owner-1');
    expect(dependencies.listOverdueTasks).toHaveBeenCalledWith(
      'owner-1',
      new Date('2026-11-06T00:00:00.000Z')
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 21,
        dueDate: '2026-11-04',
      }),
    ]);
  });

  it('falls back to UTC when the caller has no timezone', async () => {
    const now = new Date('2026-11-05T16:30:00.000Z');
    const dependencies = {
      findUserTimezone: vi.fn().mockResolvedValue(null),
      listOverdueTasks: vi.fn().mockResolvedValue([]),
    };
    const service = new OverdueTasksService(dependencies, () => now);

    await service.list('owner-1');

    expect(dependencies.listOverdueTasks).toHaveBeenCalledWith(
      'owner-1',
      new Date('2026-11-05T00:00:00.000Z')
    );
  });
});
