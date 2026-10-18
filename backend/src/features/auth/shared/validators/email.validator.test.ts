import { describe, expect, it } from 'vitest';
import { emailValidator } from './email.validator';

describe('emailValidator', () => {
  it('normalizes valid email addresses', () => {
    expect(emailValidator.parse('Harvey@Example.COM')).toBe(
      'harvey@example.com',
    );
  });

  it('rejects invalid email addresses', () => {
    expect(emailValidator.safeParse('not-an-email').success).toBe(false);
  });
});
