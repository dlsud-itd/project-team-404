import { formatDate, instantToDate, userTimeZone } from './date-format.util';

describe('formatDate', () => {
  const today = new Date(2026, 9, 30);

  it('shows month and day for this year', () => {
    expect(formatDate('2026-10-02', today)).toBe('Oct 2');
  });

  it('adds the year for another year', () => {
    expect(formatDate('2027-01-15', today)).toBe('Jan 15, 2027');
  });
});

describe('instantToDate', () => {
  it("gives the calendar date in the user's timezone", () => {
    expect(instantToDate('2026-11-05T15:59:59.999Z', 'Asia/Manila')).toBe('2026-11-05');
  });

  it('can differ from the UTC date', () => {
    expect(instantToDate('2026-11-05T17:00:00.000Z', 'Asia/Manila')).toBe('2026-11-06');
    expect(instantToDate('2026-11-05T03:00:00.000Z', 'Pacific/Honolulu')).toBe('2026-11-04');
  });
});

describe('userTimeZone', () => {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;

  it("uses the user's timezone", () => {
    expect(userTimeZone('Asia/Manila')).toBe('Asia/Manila');
  });

  it.each([undefined, null, '', 'Not/AZone'])('falls back to the browser for %s', (timeZone) => {
    expect(userTimeZone(timeZone)).toBe(browser);
  });
});
