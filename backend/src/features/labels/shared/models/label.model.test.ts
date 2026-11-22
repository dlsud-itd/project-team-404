import { describe, expect, it } from 'vitest';
import type { LabelRecord } from './label.model';
import { toLabelModel } from './label.model';

const label: LabelRecord = {
  id: 8,
  userId: 'owner-1',
  name: 'Work',
  color: '#f59e0b',
  sortOrder: 1,
  archivedAt: null,
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
};

describe('toLabelModel', () => {
  it('omits ownership data and normalizes optional color', () => {
    const model = toLabelModel({ ...label, color: null });
    expect(model).not.toHaveProperty('userId');
    expect(model.color).toBeNull();
    expect(model.name).toBe('Work');
    expect(model.isArchived).toBe(false);
  });

  it('marks an archived label in the public model', () => {
    const archivedAt = new Date('2026-11-10T09:30:00.000Z');

    expect(toLabelModel({ ...label, archivedAt })).toMatchObject({
      isArchived: true,
      archivedAt,
    });
  });
});
