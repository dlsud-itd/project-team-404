import { describe, expect, it } from 'vitest';
import { setArchivedValidator } from './set-archived.validator';

describe('setArchivedValidator', () => {
  it('requires a boolean archived flag', () => {
    expect(setArchivedValidator.parse({ isArchived: true })).toEqual({
      isArchived: true,
    });
    expect(setArchivedValidator.parse({ isArchived: false })).toEqual({
      isArchived: false,
    });
    expect(setArchivedValidator.safeParse({}).success).toBe(false);
    expect(setArchivedValidator.safeParse({ isArchived: 'true' }).success).toBe(
      false
    );
  });
});
