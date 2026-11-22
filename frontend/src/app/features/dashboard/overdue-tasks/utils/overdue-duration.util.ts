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
 * How late a task with this deadline is at `now`, counted in calendar days in `timeZone`.
 * A deadline from yesterday evening is "1 day overdue" even if fewer than 24 hours have passed.
 */
export function overdueDuration(deadline: string, now: Date, timeZone: string): OverdueDuration {
  const days = Math.max(
    0,
    daysBetween(instantToDate(deadline, timeZone), instantToDate(now.toISOString(), timeZone)),
  );
  if (days === 0) return { days, label: 'Due earlier today' };
  return { days, label: `${days} ${days === 1 ? 'day' : 'days'} overdue` };
}
