import { describe, expect, it } from 'vitest';
import type { TaskRecord } from './task.model';
import { toTaskModel } from './task.model';

const record: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  title: 'Review sprint plan',
  description: 'Check the milestones',
  priority: 'high',
  dueDate: new Date('2026-11-02T00:00:00.000Z'),
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  deletedAt: null,
};

describe('toTaskModel', () => {
  it('removes private fields and normalizes dates', () => {
    const model = toTaskModel(record);

    expect(model).not.toHaveProperty('userId');
    expect(model).not.toHaveProperty('deletedAt');
    expect(model.dueDate).toBe('2026-11-02');
    expect(model.createdAt).toEqual(record.createdAt);
  });
});
