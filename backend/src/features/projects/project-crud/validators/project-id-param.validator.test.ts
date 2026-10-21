import { describe, expect, it } from 'vitest';
import { projectIdParamValidator } from './project-id-param.validator';

describe('projectIdParamValidator', () => {
  it('parses positive integer path parameters', () => {
    expect(projectIdParamValidator.parse('42')).toBe(42);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid ID %s', (id) => {
    expect(projectIdParamValidator.safeParse(id).success).toBe(false);
  });
});
