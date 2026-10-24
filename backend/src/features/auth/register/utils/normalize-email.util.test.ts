import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './normalize-email.util';

describe('normalizeEmail', () => {
  it('trims and lowercases an address', () => {
    expect(normalizeEmail('  Harvey@Example.COM ')).toBe('harvey@example.com');
  });
});
