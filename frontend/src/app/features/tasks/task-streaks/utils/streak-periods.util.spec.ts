import { STREAK_TODAY as TODAY, apiStreak } from '../testing/streak-fixtures';
import type { StreakPeriodState, StreakRecurrence } from '../types/task-streak.types';
import {
  addMonths,
  diffMonths,
  nextDueWindow,
  streakPeriods,
  toTaskStreak,
} from './streak-periods.util';

function streak(
  recurrence: StreakRecurrence,
  lastCompletedOn: string | null,
  currentStreak: number,
) {
  return toTaskStreak(apiStreak(1, { lastCompletedOn, currentStreak }), recurrence, TODAY);
}

/** The strip as `date state` strings, oldest first. */
function strip(recurrence: StreakRecurrence, last: string | null, current: number): string[] {
  return streakPeriods(streak(recurrence, last, current), TODAY).map(
    ({ date, state }) => `${date} ${state}`,
  );
}

function states(recurrence: StreakRecurrence, last: string | null, current: number) {
  return streakPeriods(streak(recurrence, last, current), TODAY).map(({ state }) => state);
}

const repeat = (state: StreakPeriodState, count: number) =>
  Array<StreakPeriodState>(count).fill(state);

describe('streak period helpers', () => {
  it('counts months across years and finds month starts', () => {
    expect(diffMonths('2025-12-31', '2026-01-01')).toBe(1);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-01');
  });

  it('expects daily and weekly repeats on one day, monthly ones any day of the next month', () => {
    expect(nextDueWindow('2026-11-18', 'daily')).toEqual({
      start: '2026-11-19',
      end: '2026-11-19',
    });
    expect(nextDueWindow('2026-11-12', 'weekly')).toEqual({
      start: '2026-11-19',
      end: '2026-11-19',
    });
    expect(nextDueWindow('2026-12-15', 'monthly')).toEqual({
      start: '2027-01-01',
      end: '2027-01-31',
    });
  });
});

describe('toTaskStreak', () => {
  it('is done, not at risk, when today is already completed', () => {
    expect(streak('daily', TODAY, 5)).toMatchObject({
      status: 'done',
      atRisk: false,
      currentStreak: 5,
      nextDueOn: '2026-11-20',
    });
  });

  it("is at risk when today's daily occurrence is still open", () => {
    expect(streak('daily', '2026-11-18', 4)).toMatchObject({
      status: 'at-risk',
      atRisk: true,
      currentStreak: 4,
      nextDueOn: TODAY,
    });
  });

  it('is broken once a daily occurrence was missed', () => {
    expect(streak('daily', '2026-11-16', 0)).toMatchObject({
      status: 'broken',
      atRisk: false,
      currentStreak: 0,
      nextDueOn: null,
      runLength: 1,
    });
  });

  it('is done for the week until the weekly occurrence comes round', () => {
    expect(streak('weekly', '2026-11-16', 3)).toMatchObject({ status: 'done', atRisk: false });
  });

  it('is at risk on the day the next weekly occurrence is due', () => {
    expect(streak('weekly', '2026-11-12', 3)).toMatchObject({ status: 'at-risk', atRisk: true });
  });

  it('resets a weekly streak the server still counts once its occurrence has passed', () => {
    expect(streak('weekly', '2026-11-10', 5)).toMatchObject({
      status: 'broken',
      currentStreak: 0,
      longestStreak: 7,
      runLength: 5,
    });
  });

  it('is at risk all of the month after a monthly completion, then broken', () => {
    expect(streak('monthly', '2026-11-02', 2)).toMatchObject({ status: 'done' });
    expect(streak('monthly', '2026-10-31', 2)).toMatchObject({
      status: 'at-risk',
      atRisk: true,
      nextDueOn: '2026-11-01',
    });
    expect(streak('monthly', '2026-09-30', 2)).toMatchObject({
      status: 'broken',
      currentStreak: 0,
    });
  });

  it('has no status until something is completed', () => {
    expect(streak('daily', null, 0)).toMatchObject({
      status: 'none',
      atRisk: false,
      currentStreak: 0,
      runLength: 0,
      nextDueOn: null,
    });
  });
});

describe('streakPeriods', () => {
  it('shows a running daily streak ending in an open today', () => {
    const cells = strip('daily', '2026-11-18', 3);
    expect(cells).toHaveLength(14);
    expect(cells[0]).toBe('2026-11-06 unknown');
    expect(cells.slice(-5)).toEqual([
      '2026-11-15 unknown',
      '2026-11-16 done',
      '2026-11-17 done',
      '2026-11-18 done',
      '2026-11-19 open',
    ]);
  });

  it('ends with a done today when today is completed', () => {
    expect(strip('daily', TODAY, 2).slice(-3)).toEqual([
      '2026-11-17 unknown',
      '2026-11-18 done',
      '2026-11-19 done',
    ]);
  });

  it('marks the days after the last completion missed', () => {
    expect(states('daily', '2026-11-15', 0)).toEqual([
      ...repeat('unknown', 9),
      'done',
      'missed',
      'missed',
      'missed',
      'open',
    ]);
  });

  it('steps weekly streaks a week at a time from the last completion', () => {
    expect(strip('weekly', '2026-11-12', 2).slice(-4)).toEqual([
      '2026-10-29 unknown',
      '2026-11-05 done',
      '2026-11-12 done',
      '2026-11-19 open',
    ]);
  });

  it('marks a weekly occurrence missed once its day has passed', () => {
    expect(strip('weekly', '2026-11-10', 3).slice(-5)).toEqual([
      '2026-10-20 unknown',
      '2026-10-27 done',
      '2026-11-03 done',
      '2026-11-10 done',
      '2026-11-17 missed',
    ]);
  });

  it('steps monthly streaks a calendar month at a time', () => {
    const cells = strip('monthly', '2026-10-15', 2);
    expect(cells[0]).toBe('2025-10-01 unknown');
    expect(cells.slice(-3)).toEqual(['2026-09-01 done', '2026-10-01 done', '2026-11-01 open']);
  });

  it('shows only an open current period before the first completion', () => {
    expect(states('daily', null, 0)).toEqual([...repeat('unknown', 13), 'open']);
    expect(strip('monthly', null, 0).at(-1)).toBe('2026-11-01 open');
  });
});
