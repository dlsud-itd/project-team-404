import { describe, expect, it } from 'vitest';
import { passwordValidator } from './password.validator';

describe('passwordValidator', () => {
  it('requires at least eight characters', () => {
    expect(passwordValidator.safeParse('short').success).toBe(false);
    expect(passwordValidator.safeParse('secure-password').success).toBe(true);
  });
});
