import { describe, expect, it } from 'vitest';
import { reorderProjectsValidator } from './reorder-projects.validator';

describe('reorderProjectsValidator', () => {
  it('accepts unique positive project IDs', () => {
    expect(reorderProjectsValidator.parse({ projectIds: [4, 9, 12] })).toEqual({
      projectIds: [4, 9, 12],
    });
  });

  it('rejects duplicate, non-positive, non-integer, and missing project IDs', () => {
    expect(
      reorderProjectsValidator.safeParse({ projectIds: [4, 4] }).success
    ).toBe(false);
    expect(
      reorderProjectsValidator.safeParse({ projectIds: [0] }).success
    ).toBe(false);
    expect(
      reorderProjectsValidator.safeParse({ projectIds: [1.5] }).success
    ).toBe(false);
    expect(reorderProjectsValidator.safeParse({}).success).toBe(false);
  });
});
