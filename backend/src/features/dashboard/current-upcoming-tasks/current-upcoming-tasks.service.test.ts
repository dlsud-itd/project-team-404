import { describe, expect, it, vi } from 'vitest';
import type { TaskRecord } from '../../tasks/shared/models/task.model';
import { CurrentUpcomingTasksService } from './current-upcoming-tasks.service';

const task: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  title: 'Review sprint plan',
  description: null,
  priorityId: 2,
  scheduledDate: null,
  dueDate: new Date('2026-11-06T00:00:00.000Z'),
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-11-05T00:00:00.000Z'),
  updatedAt: new Date('2026-11-05T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: {
    id: 2,
    userId: 'owner-1',
    name: 'medium',
    color: '#a3a3a3',
    isDefault: true,
    sortOrder: 2,
    deletedAt: null,
    createdAt: new Date('2026-10-30T00:00:00.000Z'),
    updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  },
  taskLabels: [],
};

describe('CurrentUpcomingTasksService', () => {
  it('queries the caller-local date window and maps the results', async () => {
    const dependencies = {
      findUserTimezone: vi.fn().mockResolvedValue('Asia/Manila'),
      listTasksDueBetween: vi.fn().mockResolvedValue([task]),
    };
    const service = new CurrentUpcomingTasksService(
      dependencies,
      () => new Date('2026-11-05T16:30:00.000Z')
    );

    const result = await service.list('owner-1', 2);

    expect(dependencies.findUserTimezone).toHaveBeenCalledWith('owner-1');
    expect(dependencies.listTasksDueBetween).toHaveBeenCalledWith(
      'owner-1',
      '2026-11-06',
      '2026-11-08'
    );
    expect(result).toEqual([
      expect.objectContaining({ id: 21, dueDate: '2026-11-06' }),
    ]);
  });

  it('uses UTC when the caller has no timezone', async () => {
    const dependencies = {
      findUserTimezone: vi.fn().mockResolvedValue(null),
      listTasksDueBetween: vi.fn().mockResolvedValue([]),
    };
    const service = new CurrentUpcomingTasksService(
      dependencies,
      () => new Date('2026-11-05T23:30:00.000Z')
    );

    await service.list('owner-1', 1);

    expect(dependencies.listTasksDueBetween).toHaveBeenCalledWith(
      'owner-1',
      '2026-11-05',
      '2026-11-06'
    );
  });
});
