import { describe, expect, it } from 'vitest';
import { usernameValidator } from './username.validator';

describe('usernameValidator', () => {
  it('trims and enforces the username length limit', () => {
    expect(usernameValidator.parse(' harvey ')).toBe('harvey');
    expect(usernameValidator.safeParse('x'.repeat(51)).success).toBe(false);
  });
});
