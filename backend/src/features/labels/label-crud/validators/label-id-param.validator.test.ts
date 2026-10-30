import { describe, expect, it } from 'vitest';
import { labelIdParamValidator } from './label-id-param.validator';

describe('labelIdParamValidator', () => {
  it('coerces positive label IDs', () => {
    expect(labelIdParamValidator.parse('4')).toBe(4);
  });

  it('rejects invalid IDs', () => {
    expect(() => labelIdParamValidator.parse('0')).toThrow();
  });
});
