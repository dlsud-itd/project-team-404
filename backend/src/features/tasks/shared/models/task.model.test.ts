import { describe, expect, it } from 'vitest';
import type { TaskRecord } from './task.model';
import { toTaskModel } from './task.model';

const record: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  title: 'Review sprint plan',
  description: 'Check the milestones',
  priorityId: 3,
  dueDate: new Date('2026-11-02T00:00:00.000Z'),
  scheduledDate: null,
  deadline: null,
  recurrence: 'none',
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: { id: 3, name: 'high', sortOrder: 3 },
  taskLabels: [],
};

describe('toTaskModel', () => {
  it('removes private fields and normalizes dates', () => {
    const model = toTaskModel(record);

    expect(model).not.toHaveProperty('userId');
    expect(model).not.toHaveProperty('deletedAt');
    expect(model.dueDate).toBe('2026-11-02');
    expect(model.priority).toBe('high');
    expect(model.labels).toEqual([]);
    expect(model.createdAt).toEqual(record.createdAt);
  });
});
