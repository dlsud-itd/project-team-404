import { describe, expect, it } from 'vitest';
import { escapeLikeLiteral } from './escape-like-literal.util';

describe('escapeLikeLiteral', () => {
  it('escapes SQL LIKE wildcards and escape characters as literals', () => {
    expect(escapeLikeLiteral('50%_done\\')).toBe('50\\%\\_done\\\\');
  });

  it('preserves ordinary and accented characters', () => {
    expect(escapeLikeLiteral('Café Orbit')).toBe('Café Orbit');
  });
});
