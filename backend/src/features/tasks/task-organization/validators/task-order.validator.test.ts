import { describe, expect, it } from 'vitest';
import { taskOrderValidator } from './task-order.validator';

describe('taskOrderValidator', () => {
  it('defaults the direction and validates explicit ordering', () => {
    expect(taskOrderValidator.parse({})).toEqual({ orderDirection: 'asc' });
    expect(
      taskOrderValidator.parse({ orderBy: 'priority', orderDirection: 'desc' })
    ).toEqual({ orderBy: 'priority', orderDirection: 'desc' });
  });

  it('rejects unsupported ordering values', () => {
    expect(() => taskOrderValidator.parse({ orderBy: 'random' })).toThrow();
    expect(() =>
      taskOrderValidator.parse({ orderDirection: 'sideways' })
    ).toThrow();
  });
});
