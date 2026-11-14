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
  recurrenceDays: [],
  recurrenceEndDate: null,
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: {
    id: 3,
    userId: 'owner-1',
    name: 'high',
    color: '#ef4444',
    isDefault: false,
    sortOrder: 3,
    deletedAt: null,
    createdAt: new Date('2026-10-30T00:00:00.000Z'),
    updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  },
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

  it('normalizes title-case priority names', () => {
    const model = toTaskModel({
      ...record,
      priorityLevel: { ...record.priorityLevel, name: 'Medium' },
    });

    expect(model.priority).toBe('medium');
  });

  it('returns custom priority details for user-managed levels', () => {
    const model = toTaskModel({
      ...record,
      priorityLevel: {
        ...record.priorityLevel,
        id: 21,
        name: 'Test',
        color: '#123456',
        sortOrder: 4,
      },
    });

    expect(model.priority).toEqual({
      id: 21,
      name: 'Test',
      color: '#123456',
      sortOrder: 4,
    });
  });
});
