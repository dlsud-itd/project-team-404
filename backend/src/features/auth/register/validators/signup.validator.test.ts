import { describe, expect, it } from 'vitest';
import { signupValidator } from './signup.validator';

describe('signupValidator', () => {
  const valid = {
    username: 'harvey',
    email: 'Harvey@example.com',
    password: 'secure-password',
    confirmPassword: 'secure-password',
    timezone: 'Asia/Manila',
  };

  it('normalizes email and validates a signup payload', () => {
    expect(signupValidator.parse(valid).email).toBe('harvey@example.com');
  });

  it('rejects mismatched passwords and invalid timezones', () => {
    expect(
      signupValidator.safeParse({
        ...valid,
        confirmPassword: 'different-password',
      }).success
    ).toBe(false);
    expect(
      signupValidator.safeParse({ ...valid, timezone: 'Mars/Olympus' }).success
    ).toBe(false);
  });
});
