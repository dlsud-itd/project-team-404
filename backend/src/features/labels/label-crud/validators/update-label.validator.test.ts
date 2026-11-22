import { describe, expect, it } from 'vitest';
import { updateLabelValidator } from './update-label.validator';

describe('updateLabelValidator', () => {
  it('accepts a name or a nullable color update', () => {
    expect(updateLabelValidator.parse({ name: 'Urgent' })).toEqual({
      name: 'Urgent',
    });
    expect(updateLabelValidator.parse({ color: null })).toEqual({
      color: null,
    });
  });

  it('rejects an empty update and unsupported properties', () => {
    expect(() => updateLabelValidator.parse({})).toThrow();
    expect(() =>
      updateLabelValidator.parse({ name: 'Work', ownerId: 'other' })
    ).toThrow();
  });
});
