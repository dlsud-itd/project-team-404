import { describe, expect, it } from 'vitest';
import { listProjectsQueryValidator } from './list-projects-query.validator';

describe('listProjectsQueryValidator', () => {
  it('converts the archived filter to a boolean', () => {
    expect(listProjectsQueryValidator.parse({ isArchived: 'true' })).toEqual({
      isArchived: true,
    });
    expect(listProjectsQueryValidator.parse({ isArchived: 'false' })).toEqual({
      isArchived: false,
    });
  });

  it('accepts no filter and rejects invalid filter values', () => {
    expect(listProjectsQueryValidator.parse({})).toEqual({});
    expect(
      listProjectsQueryValidator.safeParse({ isArchived: 'yes' }).success
    ).toBe(false);
  });
});
