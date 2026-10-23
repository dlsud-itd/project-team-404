import { describe, expect, it } from 'vitest';
import { setSortOrderValidator } from './set-sort-order.validator';

describe('setSortOrderValidator', () => {
  it('accepts non-negative integer sort orders', () => {
    expect(setSortOrderValidator.parse({ sortOrder: 0 })).toEqual({
      sortOrder: 0,
    });
    expect(setSortOrderValidator.parse({ sortOrder: 2 })).toEqual({
      sortOrder: 2,
    });
  });

  it('rejects missing, negative, and non-integer sort orders', () => {
    expect(setSortOrderValidator.safeParse({}).success).toBe(false);
    expect(setSortOrderValidator.safeParse({ sortOrder: -1 }).success).toBe(
      false
    );
    expect(setSortOrderValidator.safeParse({ sortOrder: 1.5 }).success).toBe(
      false
    );
  });
});
