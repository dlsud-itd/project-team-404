import { describe, expect, it } from 'vitest';
import { taskPriorityValidator } from './priority.validator';

describe('taskPriorityValidator', () => {
  it('accepts supported priorities', () => {
    expect(taskPriorityValidator.parse({ priority: 'high' })).toEqual({
      priority: 'high',
    });
  });

  it('rejects unsupported priorities and extra fields', () => {
    expect(() => taskPriorityValidator.parse({ priority: 'urgent' })).toThrow();
    expect(() =>
      taskPriorityValidator.parse({ priority: 'low', extra: true })
    ).toThrow();
  });
});
