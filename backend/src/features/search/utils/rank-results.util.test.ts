import { describe, expect, it } from 'vitest';
import {
  getSearchRank,
  rankSearchResults,
  SEARCH_RANK,
} from './rank-results.util';

describe('rank search results', () => {
  it('ranks case-insensitive exact, starts-with, and contains matches', () => {
    expect(getSearchRank('ORBIT', 'orbit')).toBe(SEARCH_RANK.exact);
    expect(getSearchRank('Orbit launch', 'orbit')).toBe(SEARCH_RANK.startsWith);
    expect(getSearchRank('Planning around Orbit', 'orbit')).toBe(
      SEARCH_RANK.contains
    );
    expect(getSearchRank('No match', 'orbit')).toBeNull();
  });

  it('uses most recently updated and then stable IDs for ties', () => {
    const results = [
      {
        id: 5,
        title: 'Planning around Orbit',
        updatedAt: new Date('2026-11-12'),
      },
      { id: 2, title: 'Orbit', updatedAt: new Date('2026-11-13') },
      { id: 4, title: 'Orbit launch', updatedAt: new Date('2026-11-13') },
      { id: 3, title: 'ORBIT', updatedAt: new Date('2026-11-13') },
      { id: 6, title: 'Orbit', updatedAt: new Date('2026-11-14') },
    ];

    expect(
      rankSearchResults(results, 'orbit', (result) => result.title).map(
        ({ id }) => id
      )
    ).toEqual([6, 3, 2, 4, 5]);
  });
});
