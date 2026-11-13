import { describe, expect, it } from 'vitest';
import { listProjectsQueryValidator } from './list-projects-query.validator';

describe('listProjectsQueryValidator', () => {
  it('parses favorite, archive, color, sort, and limit filters', () => {
    expect(
      listProjectsQueryValidator.parse({
        isFavorite: 'true',
        isArchived: 'false',
        color: '#d9F2ff',
        orderBy: 'name',
        orderDirection: 'desc',
        limit: '10',
      })
    ).toEqual({
      isFavorite: true,
      isArchived: false,
      color: '#D9F2FF',
      orderBy: 'name',
      orderDirection: 'desc',
      limit: 10,
    });
  });

  it('keeps archive filtering optional', () => {
    expect(listProjectsQueryValidator.parse({})).toEqual({});
    expect(listProjectsQueryValidator.parse({ isArchived: 'true' })).toEqual({
      isArchived: true,
    });
  });

  it.each([
    ['isFavorite', { isFavorite: 'yes' }],
    ['isArchived', { isArchived: 'yes' }],
    ['color format', { color: 'blue' }],
    ['color length', { color: '#12345' }],
    ['orderBy', { orderBy: 'random' }],
    ['orderDirection', { orderDirection: 'sideways' }],
    ['limit zero', { limit: '0' }],
    ['limit over maximum', { limit: '101' }],
    ['limit non-integer', { limit: '1.5' }],
    ['unexpected parameter', { unsupported: 'value' }],
  ])('rejects invalid %s values', (_name, query) => {
    expect(listProjectsQueryValidator.safeParse(query).success).toBe(false);
  });
});
