import {
  addDays,
  barGeometry,
  dateToX,
  dayCount,
  daysBetween,
  daysIn,
  inWindow,
  shiftWindow,
  spanLabel,
  windowFor,
  windowLabel,
  xToDate,
} from './timeline-scale.util';

const NOV_WEEK = { from: '2026-11-23', to: '2026-11-29' };
const NOVEMBER = { from: '2026-11-01', to: '2026-11-30' };

describe('timeline scale', () => {
  describe('windows', () => {
    it('gives the Monday-to-Sunday week holding a day', () => {
      expect(windowFor('week', '2026-11-25')).toEqual(NOV_WEEK);
      expect(windowFor('week', '2026-11-23')).toEqual(NOV_WEEK);
      expect(windowFor('week', '2026-11-29')).toEqual(NOV_WEEK);
    });

    it('gives weeks that cross a month or a year', () => {
      expect(windowFor('week', '2026-12-01')).toEqual({ from: '2026-11-30', to: '2026-12-06' });
      expect(windowFor('week', '2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-03' });
    });

    it('gives the calendar month holding a day, including leap Februaries', () => {
      expect(windowFor('month', '2026-11-25')).toEqual(NOVEMBER);
      expect(windowFor('month', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
      expect(windowFor('month', '2027-02-10')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    });

    it('moves a week or a month at a time, across years', () => {
      expect(shiftWindow('week', NOV_WEEK, 1)).toEqual({ from: '2026-11-30', to: '2026-12-06' });
      expect(shiftWindow('week', NOV_WEEK, -1)).toEqual({ from: '2026-11-16', to: '2026-11-22' });
      expect(shiftWindow('month', { from: '2026-12-01', to: '2026-12-31' }, 1)).toEqual({
        from: '2027-01-01',
        to: '2027-01-31',
      });
      expect(shiftWindow('month', { from: '2026-03-01', to: '2026-03-31' }, -1)).toEqual({
        from: '2026-02-01',
        to: '2026-02-28',
      });
    });

    it('counts and checks days', () => {
      expect(dayCount(NOV_WEEK)).toBe(7);
      expect(dayCount(NOVEMBER)).toBe(30);
      expect(daysBetween('2026-11-30', '2026-11-28')).toBe(-2);
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
      expect(inWindow('2026-11-29', NOV_WEEK)).toBe(true);
      expect(inWindow('2026-11-30', NOV_WEEK)).toBe(false);
    });
  });

  it('lists each day with its weekday, weekend flag and month on the 1st', () => {
    const days = daysIn({ from: '2026-11-28', to: '2026-12-01' });
    expect(days.map((d) => [d.date, d.weekday, d.isWeekend, d.monthLabel])).toEqual([
      ['2026-11-28', 'Sat', true, null],
      ['2026-11-29', 'Sun', true, null],
      ['2026-11-30', 'Mon', false, null],
      ['2026-12-01', 'Tue', false, 'Dec'],
    ]);
  });

  describe('positions', () => {
    it('turns a date into a share of the window and back', () => {
      expect(dateToX('2026-11-23', NOV_WEEK)).toBe(0);
      expect(dateToX('2026-11-26', NOV_WEEK)).toBeCloseTo((3 / 7) * 100);
      for (const date of daysIn(NOVEMBER).map((d) => d.date)) {
        // The middle of each day's column gives the day back.
        expect(xToDate(dateToX(date, NOVEMBER) + 1, NOVEMBER)).toBe(date);
      }
    });

    it('keeps positions outside the window on its first or last day', () => {
      expect(xToDate(-20, NOV_WEEK)).toBe('2026-11-23');
      expect(xToDate(100, NOV_WEEK)).toBe('2026-11-29');
      expect(xToDate(140, NOV_WEEK)).toBe('2026-11-29');
    });

    it('spans a bar from the start of its first day to the end of its last', () => {
      expect(barGeometry({ start: '2026-11-24', end: '2026-11-26' }, NOV_WEEK)).toEqual({
        left: (1 / 7) * 100,
        width: (3 / 7) * 100,
        clippedStart: false,
        clippedEnd: false,
      });
      const oneDay = barGeometry({ start: '2026-11-29', end: '2026-11-29' }, NOV_WEEK);
      expect(oneDay?.left).toBeCloseTo((6 / 7) * 100);
      expect(oneDay?.width).toBeCloseTo((1 / 7) * 100);
    });

    it('cuts bars that cross either edge of the window', () => {
      const left = barGeometry({ start: '2026-11-20', end: '2026-11-24' }, NOV_WEEK);
      expect(left).toEqual({
        left: 0,
        width: (2 / 7) * 100,
        clippedStart: true,
        clippedEnd: false,
      });
      const both = barGeometry({ start: '2026-11-01', end: '2026-12-31' }, NOV_WEEK);
      expect(both).toEqual({ left: 0, width: 100, clippedStart: true, clippedEnd: true });
    });

    it('has no place for a bar wholly outside the window', () => {
      expect(barGeometry({ start: '2026-11-10', end: '2026-11-22' }, NOV_WEEK)).toBeNull();
      expect(barGeometry({ start: '2026-11-30', end: '2026-12-02' }, NOV_WEEK)).toBeNull();
    });
  });

  describe('labels', () => {
    it('names a week or a month', () => {
      expect(windowLabel('week', NOV_WEEK)).toBe('Nov 23 – 29, 2026');
      expect(windowLabel('week', { from: '2026-11-30', to: '2026-12-06' })).toBe(
        'Nov 30 – Dec 6, 2026',
      );
      expect(windowLabel('week', { from: '2026-12-28', to: '2027-01-03' })).toBe(
        'Dec 28, 2026 – Jan 3, 2027',
      );
      expect(windowLabel('month', NOVEMBER)).toBe('November 2026');
    });

    it("names a bar's dates", () => {
      expect(spanLabel('2026-11-03', '2026-11-07')).toBe('Nov 3 – Nov 7, 2026');
      expect(spanLabel('2026-11-03', '2026-11-03')).toBe('Nov 3, 2026');
      expect(spanLabel('2026-12-30', '2027-01-02')).toBe('Dec 30, 2026 – Jan 2, 2027');
    });
  });
});
