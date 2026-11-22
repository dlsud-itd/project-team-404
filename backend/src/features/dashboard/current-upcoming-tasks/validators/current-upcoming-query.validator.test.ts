import { describe, expect, it } from 'vitest';
import {
  currentUpcomingQueryValidator,
  DEFAULT_CURRENT_UPCOMING_DAYS,
  MAX_CURRENT_UPCOMING_DAYS,
} from './current-upcoming-query.validator';

describe('currentUpcomingQueryValidator', () => {
  it('defaults the window when days is omitted', () => {
    expect(currentUpcomingQueryValidator.parse({})).toEqual({
      days: DEFAULT_CURRENT_UPCOMING_DAYS,
    });
  });

  it('accepts a positive integer through the maximum', () => {
    expect(currentUpcomingQueryValidator.parse({ days: '1' })).toEqual({
      days: 1,
    });
    expect(
      currentUpcomingQueryValidator.parse({
        days: String(MAX_CURRENT_UPCOMING_DAYS),
      })
    ).toEqual({ days: MAX_CURRENT_UPCOMING_DAYS });
  });

  it.each([
    '0',
    '-1',
    String(MAX_CURRENT_UPCOMING_DAYS + 1),
    'tomorrow',
    '1.5',
  ])('rejects invalid days value %s', (days) => {
    expect(currentUpcomingQueryValidator.safeParse({ days }).success).toBe(
      false
    );
  });

  it('rejects unknown query parameters', () => {
    expect(
      currentUpcomingQueryValidator.safeParse({ days: '2', extra: 'true' })
        .success
    ).toBe(false);
  });
});
