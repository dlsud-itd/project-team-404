import {
  STREAK_STRIP_LENGTH,
  type ApiTaskStreak,
  type StreakPeriod,
  type StreakPeriodState,
  type StreakRecurrence,
  type TaskStreak,
} from '../types/task-streak.types';

/*
 * All dates here are YYYY-MM-DD calendar days in the user's timezone, worked on as UTC midnights
 * so no local clock change can shift them.
 *
 * The rules copy how the server links completions into a streak
 * (backend/src/features/tasks/task-streaks/task-streaks.service.ts): daily completions must be
 * one day apart, weekly ones exactly seven days apart, and monthly ones in consecutive calendar
 * months. So after a completion the next one is due on a single day (daily and weekly), or on any
 * day of the next month (monthly). Once that window has passed the streak is over.
 */

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function fromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** The first day of the month `months` after the month of `date`. */
export function addMonths(date: string, months: number): string {
  const [year, month] = date.split('-').map(Number);
  return fromUtc(Date.UTC(year, month - 1 + months, 1));
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Calendar months from the month of `from` to the month of `to`. */
export function diffMonths(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

/** The days on which the occurrence after a completion on `last` keeps the streak going. */
export function nextDueWindow(
  last: string,
  recurrence: StreakRecurrence,
): { start: string; end: string } {
  if (recurrence === 'daily') {
    const day = addDays(last, 1);
    return { start: day, end: day };
  }
  if (recurrence === 'weekly') {
    const day = addDays(last, 7);
    return { start: day, end: day };
  }
  return { start: addMonths(last, 1), end: addDays(addMonths(last, 2), -1) };
}

/**
 * The server's streak, checked against today. The server only resets daily streaks after a miss,
 * so a weekly or monthly streak whose occurrence has passed is set to 0 here.
 */
export function toTaskStreak(
  api: Pick<ApiTaskStreak, 'taskId' | 'currentStreak' | 'longestStreak' | 'lastCompletedOn'>,
  recurrence: StreakRecurrence,
  today: string,
): TaskStreak {
  const base = {
    taskId: api.taskId,
    recurrence,
    longestStreak: api.longestStreak,
    lastCompletedOn: api.lastCompletedOn,
  };
  const last = api.lastCompletedOn;
  if (!last) {
    return {
      ...base,
      currentStreak: 0,
      runLength: 0,
      nextDueOn: null,
      status: 'none',
      atRisk: false,
    };
  }

  // The streak that ended on `last`. A daily streak the server has already reset tells us only
  // that `last` itself was done.
  const runLength = Math.max(api.currentStreak, 1);
  const { start, end } = nextDueWindow(last, recurrence);
  if (today > end) {
    return {
      ...base,
      currentStreak: 0,
      runLength,
      nextDueOn: null,
      status: 'broken',
      atRisk: false,
    };
  }
  const due = today >= start;
  return {
    ...base,
    currentStreak: api.currentStreak,
    runLength,
    nextDueOn: start,
    status: due ? 'at-risk' : 'done',
    atRisk: due && api.currentStreak > 0,
  };
}

/** Where period `offset` (0 = the period of the last completion) begins. */
function periodDate(anchor: string, recurrence: StreakRecurrence, offset: number): string {
  if (recurrence === 'daily') return addDays(anchor, offset);
  if (recurrence === 'weekly') return addDays(anchor, offset * 7);
  return addMonths(anchor, offset);
}

/** The period, counted from the anchor's, that today falls in. */
function periodOf(anchor: string, recurrence: StreakRecurrence, today: string): number {
  if (recurrence === 'daily') return diffDays(anchor, today);
  if (recurrence === 'weekly') return Math.floor(diffDays(anchor, today) / 7);
  return diffMonths(anchor, today);
}

/**
 * The last `length` periods, oldest first, ending with the one today falls in. The API sends
 * only the current streak and the last completion, so periods are known back to the start of
 * the run that ended on the last completion; anything older is 'unknown'.
 */
export function streakPeriods(
  streak: TaskStreak,
  today: string,
  length: number = STREAK_STRIP_LENGTH,
): StreakPeriod[] {
  const { recurrence, lastCompletedOn: last, runLength } = streak;
  const anchor = last ?? (recurrence === 'monthly' ? addMonths(today, 0) : today);
  const current = last ? Math.max(periodOf(anchor, recurrence, today), 0) : 0;

  const periods: StreakPeriod[] = [];
  for (let offset = current - length + 1; offset <= current; offset++) {
    const date = periodDate(anchor, recurrence, offset);
    periods.push({ date, state: periodState(offset, current, date) });
  }
  return periods;

  function periodState(offset: number, now: number, date: string): StreakPeriodState {
    if (!last) return offset === now ? 'open' : 'unknown';
    if (offset === 0) return 'done';
    if (offset < 0) return -offset < runLength ? 'done' : 'unknown';
    if (offset < now) return 'missed';
    // This period's occurrence: monthly ones can be done any day of the month, others only on
    // their own day.
    return recurrence === 'monthly' || date === today ? 'open' : 'missed';
  }
}

/** True when a task's repeat can carry a streak. */
export function isStreakRecurrence(
  recurrence: string | null | undefined,
): recurrence is StreakRecurrence {
  return recurrence === 'daily' || recurrence === 'weekly' || recurrence === 'monthly';
}
