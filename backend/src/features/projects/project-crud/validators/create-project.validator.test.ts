import { describe, expect, it } from 'vitest';
import { createProjectValidator } from './create-project.validator';

describe('createProjectValidator', () => {
  it('accepts a name and optional project details', () => {
    expect(
      createProjectValidator.parse({
        name: '  Planning  ',
        description: 'Quarterly plans',
        color: '#12aBcD',
      })
    ).toEqual({
      name: 'Planning',
      description: 'Quarterly plans',
      color: '#12aBcD',
    });
  });

  it('rejects invalid names, colors, and protected fields', () => {
    expect(createProjectValidator.safeParse({ name: ' ' }).success).toBe(false);
    expect(
      createProjectValidator.safeParse({ name: 'Plan', color: 'red' }).success
    ).toBe(false);
    expect(
      createProjectValidator.safeParse({ name: 'Plan', isInbox: true }).success
    ).toBe(false);
  });
});
