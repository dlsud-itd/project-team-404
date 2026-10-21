import { describe, expect, it } from 'vitest';
import { updateProjectValidator } from './update-project.validator';

describe('updateProjectValidator', () => {
  it('accepts a partial project update', () => {
    expect(
      updateProjectValidator.parse({
        description: null,
        isArchived: true,
      })
    ).toEqual({ description: null, isArchived: true });
  });

  it('rejects empty updates and protected fields', () => {
    expect(updateProjectValidator.safeParse({}).success).toBe(false);
    expect(
      updateProjectValidator.safeParse({ userId: 'other-user' }).success
    ).toBe(false);
  });
});
