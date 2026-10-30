import { describe, expect, it } from 'vitest';
import { taskIdParamValidator } from './task-id-param.validator';

describe('taskIdParamValidator', () => {
  it('coerces a positive integer ID', () => {
    expect(taskIdParamValidator.parse('12')).toBe(12);
  });

  it('rejects malformed, zero, and negative IDs', () => {
    expect(() => taskIdParamValidator.parse('bad')).toThrow();
    expect(() => taskIdParamValidator.parse('0')).toThrow();
    expect(() => taskIdParamValidator.parse('-1')).toThrow();
  });
});
