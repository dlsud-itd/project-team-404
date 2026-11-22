import { describe, expect, it } from 'vitest';
import { searchQueryValidator } from './search-query.validator';

describe('searchQueryValidator', () => {
  it('trims q and applies defaults', () => {
    expect(searchQueryValidator.parse({ q: '  orbit  ' })).toEqual({
      q: 'orbit',
      type: 'all',
      limit: 10,
      includeArchived: false,
    });
  });

  it('accepts explicit type, limit, and archive options', () => {
    expect(
      searchQueryValidator.parse({
        q: 'orbit',
        type: 'projects',
        limit: '20',
        includeArchived: 'true',
      })
    ).toEqual({
      q: 'orbit',
      type: 'projects',
      limit: 20,
      includeArchived: true,
    });
  });

  it.each([
    {},
    { q: 'a' },
    { q: '  ' },
    { q: 'x'.repeat(101) },
    { q: 'orbit', type: 'labels' },
    { q: 'orbit', limit: '0' },
    { q: 'orbit', limit: '21' },
    { q: 'orbit', includeArchived: 'yes' },
    { q: 'orbit', unexpected: 'value' },
  ])('rejects invalid search query %j', (query) => {
    expect(searchQueryValidator.safeParse(query).success).toBe(false);
  });
});
