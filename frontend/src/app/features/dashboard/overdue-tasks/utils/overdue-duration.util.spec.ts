import { overdueDuration } from './overdue-duration.util';

// Noon on Nov 6 in Manila (UTC+8).
const NOW = new Date('2026-11-06T04:00:00.000Z');
const MANILA = 'Asia/Manila';

describe('overdueDuration', () => {
  it('says "Due earlier today" when the deadline passed earlier the same day', () => {
    // 9 AM Nov 6 in Manila.
    expect(overdueDuration('2026-11-06T01:00:00.000Z', NOW, MANILA)).toEqual({
      days: 0,
      label: 'Due earlier today',
    });
  });

  it('counts calendar days, not 24-hour periods', () => {
    // 11:59 PM Nov 5 in Manila: barely 12 hours ago, but a day earlier.
    expect(overdueDuration('2026-11-05T15:59:59.999Z', NOW, MANILA)).toEqual({
      days: 1,
      label: '1 day overdue',
    });
  });

  it('uses the plural for several days', () => {
    expect(overdueDuration('2026-11-03T15:59:59.999Z', NOW, MANILA).label).toBe('3 days overdue');
  });

  it('counts across month and year ends', () => {
    expect(overdueDuration('2026-10-31T15:59:59.999Z', NOW, MANILA).days).toBe(6);
    const newYear = new Date('2027-01-02T04:00:00.000Z');
    expect(overdueDuration('2026-12-30T15:59:59.999Z', newYear, MANILA).days).toBe(3);
  });

  it("follows the user's timezone, so the same instants can differ by a day", () => {
    // 6 AM Nov 6 in Manila, but 12 PM Nov 5 in Honolulu; NOW is 6 PM Nov 5 in Honolulu.
    const deadline = '2026-11-05T22:00:00.000Z';
    expect(overdueDuration(deadline, NOW, MANILA).days).toBe(0);
    expect(overdueDuration(deadline, NOW, 'Pacific/Honolulu').days).toBe(0);
    // 11 PM Nov 5 in Manila is the previous day there, but the same day in Honolulu.
    const lateEvening = '2026-11-05T15:00:00.000Z';
    expect(overdueDuration(lateEvening, NOW, MANILA).days).toBe(1);
    expect(overdueDuration(lateEvening, NOW, 'Pacific/Honolulu').days).toBe(0);
  });

  it('never goes below zero', () => {
    expect(overdueDuration('2026-11-07T04:00:00.000Z', NOW, MANILA).days).toBe(0);
  });
});
