import { describe, expect, it } from 'vitest';
import { boardQueryValidator } from './board-query.validator';

describe('boardQueryValidator', () => {
  it('requires a project and parses supported task filters', () => {
    expect(
      boardQueryValidator.parse({
        projectId: '4',
        priority: 'HIGH',
        recurring: 'true',
        labelMatch: 'all',
      })
    ).toEqual({
      projectId: 4,
      priority: 'high',
      recurring: true,
      labelMatch: 'all',
      status: 'all',
    });
  });

  it('rejects missing projects and archived-task requests', () => {
    expect(boardQueryValidator.safeParse({}).success).toBe(false);
    expect(
      boardQueryValidator.safeParse({ projectId: '4', isArchived: 'true' })
        .success
    ).toBe(false);
  });

  it('rejects conflicting completion filters', () => {
    expect(
      boardQueryValidator.safeParse({
        projectId: '4',
        status: 'active',
        isDone: 'true',
      }).success
    ).toBe(false);
  });
});
