import { describe, expect, it } from 'vitest';
import { updateProjectValidator } from './update-project.validator';

describe('updateProjectValidator', () => {
  it('accepts a partial project update', () => {
    expect(
      updateProjectValidator.parse({
        description: null,
      })
    ).toEqual({ description: null });
  });

  it('rejects empty updates and protected fields', () => {
    expect(updateProjectValidator.safeParse({}).success).toBe(false);
    expect(
      updateProjectValidator.safeParse({ userId: 'other-user' }).success
    ).toBe(false);
    expect(updateProjectValidator.safeParse({ isFavorite: true }).success).toBe(
      false
    );
    expect(updateProjectValidator.safeParse({ isArchived: true }).success).toBe(
      false
    );
    expect(updateProjectValidator.safeParse({ sortOrder: 1 }).success).toBe(
      false
    );
  });
});
