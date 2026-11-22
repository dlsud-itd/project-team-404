import { WEEKDAYS, type TaskRecurrence, type Weekday } from '../types/task-scheduling.types';
import { formatDate } from './date-format.util';

const UNITS: Record<Exclude<TaskRecurrence, 'none'>, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

/** "Every week" or "Every 2 weeks"; null for a task that does not repeat. */
export function recurrenceLabel(recurrence: TaskRecurrence, interval = 1): string | null {
  if (recurrence === 'none') return null;
  const unit = UNITS[recurrence];
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
}

/** [1, 3, 5] → "Mon, Wed and Fri", Sunday first. */
export function weekdayList(days: readonly Weekday[]): string {
  const names = WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.short);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
}

/**
 * The whole rule in words: "Every week on Mon and Thu, until Dec 31". Days only count for weekly
 * repeats. Null for a task that does not repeat.
 */
export function recurrenceSummary(
  recurrence: TaskRecurrence,
  days: readonly Weekday[] = [],
  endDate: string | null = null,
  today?: Date,
): string | null {
  const label = recurrenceLabel(recurrence);
  if (!label) return null;
  const on = recurrence === 'weekly' && days.length ? ` on ${weekdayList(days)}` : '';
  const until = endDate ? `, until ${formatDate(endDate, today)}` : '';
  return `${label}${on}${until}`;
}
