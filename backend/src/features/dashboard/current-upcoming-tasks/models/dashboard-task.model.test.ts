import { describe, expect, it } from 'vitest';
import type { TaskRecord } from '../../../tasks/shared/models/task.model';
import { toDashboardTask } from './dashboard-task.model';

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

describe('toDashboardTask', () => {
  it('maps a task to the public dashboard shape', () => {
    const result = toDashboardTask(task);

    expect(result).toMatchObject({
      id: 21,
      title: 'Review sprint plan',
      priority: 'medium',
      dueDate: '2026-11-06',
      labels: [],
    });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('priorityId');
  });
});
