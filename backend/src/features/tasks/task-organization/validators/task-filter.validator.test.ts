import { describe, expect, it } from 'vitest';
import { taskFilterValidator } from './task-filter.validator';

describe('taskFilterValidator', () => {
  it('coerces label IDs and combines label and priority filters', () => {
    expect(
      taskFilterValidator.parse({ priority: 'medium', labelId: '7' })
    ).toEqual({ priority: 'medium', labelId: 7 });
  });

  it('rejects invalid filters', () => {
    expect(() => taskFilterValidator.parse({ priority: 'urgent' })).toThrow();
    expect(() => taskFilterValidator.parse({ labelId: '0' })).toThrow();
  });
});
