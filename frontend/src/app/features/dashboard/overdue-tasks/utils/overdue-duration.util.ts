import { instantToDate } from '../../../tasks/task-scheduling/utils/date-format.util';
import type { OverdueDuration } from '../types/overdue-tasks.types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from one YYYY-MM-DD date to another. Calendar dates, so clock changes don't matter. */
function daysBetween(from: string, to: string): number {
  const toUtc = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/**
 * How late a task that ended on `endDate` (YYYY-MM-DD) is at `now`, in calendar days in
 * `timeZone`. A task that ended yesterday is "1 day overdue" from the first minute of today.
 */
export function overdueDuration(endDate: string, now: Date, timeZone: string): OverdueDuration {
  const days = Math.max(0, daysBetween(endDate, instantToDate(now.toISOString(), timeZone)));
  if (days === 0) return { days, label: 'Due today' };
  return { days, label: `${days} ${days === 1 ? 'day' : 'days'} overdue` };
}
