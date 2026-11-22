import { describe, expect, it } from 'vitest';
import { overdueQueryValidator } from './overdue-query.validator';

describe('overdueQueryValidator', () => {
  it('accepts a query with no values', () => {
    expect(overdueQueryValidator.parse({})).toEqual({});
  });

  it.each([{ days: '0' }, { deadline: 'yesterday' }, { extra: 'true' }])(
    'rejects unsupported query values %#',
    (query) => {
      expect(overdueQueryValidator.safeParse(query).success).toBe(false);
    }
  );
});
