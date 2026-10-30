import { describe, expect, it } from 'vitest';
import type { LabelRecord } from './label.model';
import { toLabelModel } from './label.model';

const label: LabelRecord = {
  id: 8,
  userId: 'owner-1',
  name: 'Work',
  color: '#f59e0b',
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
};

describe('toLabelModel', () => {
  it('omits ownership data and normalizes optional color', () => {
    const model = toLabelModel({ ...label, color: null });
    expect(model).not.toHaveProperty('userId');
    expect(model.color).toBeNull();
    expect(model.name).toBe('Work');
  });
});
