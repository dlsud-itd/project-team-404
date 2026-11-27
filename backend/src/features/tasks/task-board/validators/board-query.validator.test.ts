import { describe, expect, it } from 'vitest';
import { boardQueryValidator } from './board-query.validator';

describe('boardQueryValidator', () => {
  it('parses a project and supported task filters', () => {
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

  it('accepts a missing project, for the all-projects board', () => {
    expect(boardQueryValidator.parse({})).toEqual({ status: 'all' });
  });

  it('rejects invalid projects and archived-task requests', () => {
    expect(boardQueryValidator.safeParse({ projectId: '0' }).success).toBe(
      false
    );
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
