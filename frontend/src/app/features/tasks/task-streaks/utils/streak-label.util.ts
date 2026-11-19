import { formatDate } from '../../task-scheduling/utils/date-format.util';
import type { StreakPeriod, StreakPeriodState, StreakRecurrence } from '../types/task-streak.types';

const UNITS: Record<StreakRecurrence, [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
};

/** "1 day", "4 weeks", "0 months". */
export function streakCount(count: number, recurrence: StreakRecurrence): string {
  const [one, many] = UNITS[recurrence];
  return `${count} ${count === 1 ? one : many}`;
}

/** "4 days", or "No streak yet" when no streak is running. */
export function currentStreakLabel(count: number, recurrence: StreakRecurrence): string {
  return count === 0 ? 'No streak yet' : streakCount(count, recurrence);
}

/** "Nov 15", or "Not yet" when nothing has been completed. */
export function lastCompletedLabel(date: string | null, today: Date = new Date()): string {
  return date ? formatDate(date, today) : 'Not yet';
}

/** "Nov 6", "Week of Nov 6" or "November 2026": what one period of the strip covers. */
export function periodLabel(
  period: StreakPeriod,
  recurrence: StreakRecurrence,
  today: Date = new Date(),
): string {
  if (recurrence === 'monthly') {
    const [year, month] = period.date.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
  const day = formatDate(period.date, today);
  return recurrence === 'weekly' ? `Week of ${day}` : day;
}

export const PERIOD_STATE_LABELS: Record<StreakPeriodState, string> = {
  done: 'Done',
  missed: 'Missed',
  open: 'Open',
  unknown: 'No record',
};
