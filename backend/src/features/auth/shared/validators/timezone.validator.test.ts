import { describe, expect, it } from 'vitest';
import { timezoneValidator } from './timezone.validator';

describe('timezoneValidator', () => {
  it('accepts IANA timezones and rejects unknown zones', () => {
    expect(timezoneValidator.safeParse('Asia/Manila').success).toBe(true);
    expect(timezoneValidator.safeParse('Mars/Olympus').success).toBe(false);
  });
});
