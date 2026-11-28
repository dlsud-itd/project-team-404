import { overdueDuration } from './overdue-duration.util';

// Noon on Nov 6 in Manila (UTC+8).
const NOW = new Date('2026-11-06T04:00:00.000Z');
const MANILA = 'Asia/Manila';

describe('overdueDuration', () => {
  it('is not late yet on the end date itself', () => {
    expect(overdueDuration('2026-11-06', NOW, MANILA)).toEqual({ days: 0, label: 'Due today' });
  });

  it('counts calendar days, not 24-hour periods', () => {
    expect(overdueDuration('2026-11-05', NOW, MANILA)).toEqual({
      days: 1,
      label: '1 day overdue',
    });
  });

  it('uses the plural for several days', () => {
    expect(overdueDuration('2026-11-03', NOW, MANILA).label).toBe('3 days overdue');
  });

  it('counts across month and year ends', () => {
    expect(overdueDuration('2026-10-31', NOW, MANILA).days).toBe(6);
    const newYear = new Date('2027-01-02T04:00:00.000Z');
    expect(overdueDuration('2026-12-30', newYear, MANILA).days).toBe(3);
  });

  it("measures from today in the user's timezone", () => {
    // NOW is Nov 6 in Manila but still Nov 5 in Honolulu.
    expect(overdueDuration('2026-11-05', NOW, MANILA).days).toBe(1);
    expect(overdueDuration('2026-11-05', NOW, 'Pacific/Honolulu').days).toBe(0);
  });

  it('never goes below zero', () => {
    expect(overdueDuration('2026-11-07', NOW, MANILA).days).toBe(0);
  });
});
