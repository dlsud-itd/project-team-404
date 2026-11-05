import type { DashboardTask } from '../../shared/types/dashboard.types';
import { DAY_TITLES, type DayGroup, type DayKey } from '../types/current-upcoming.types';

/** A local date as YYYY-MM-DD. toISOString would give the UTC date, which can be a day off. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local date `days` after `date`, as YYYY-MM-DD. Safe across month ends and DST changes. */
export function addDays(date: Date, days: number): string {
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** Which bucket a task belongs in, given today's and tomorrow's YYYY-MM-DD. */
export function dayOf(task: DashboardTask, today: string, tomorrow: string): DayKey {
  // The server calls a task current when it is due today, so trust that even if the clocks
  // disagree around midnight. A due date already past also stays in Today rather than vanishing.
  if (task.status === 'current') return 'today';
  if (task.dueDate === null) return 'later';
  if (task.dueDate <= today) return 'today';
  if (task.dueDate === tomorrow) return 'tomorrow';
  return 'later';
}

/**
 * Earliest due date first; within a day, timed tasks in time order before untimed ones; then by
 * the user's manual order and id so the result is stable.
 */
export function byDueDateAndTime(a: DashboardTask, b: DashboardTask): number {
  const dateA = a.dueDate ?? '￿';
  const dateB = b.dueDate ?? '￿';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  const timeA = a.dueTime ?? '￿';
  const timeB = b.dueTime ?? '￿';
  if (timeA !== timeB) return timeA < timeB ? -1 : 1;
  return a.sortOrder - b.sortOrder || a.taskId - b.taskId;
}

/**
 * Splits current and upcoming tasks into Today, Tomorrow and Later, each sorted by due date and
 * time. All three groups are always returned, in that order, so the page can show empty ones.
 *
 * @param today  the user's current day; defaults to now, in local time
 */
export function groupByDay(tasks: readonly DashboardTask[], today: Date = new Date()): DayGroup[] {
  const todayKey = toDateKey(today);
  const tomorrowKey = addDays(today, 1);
  const buckets: Record<DayKey, DashboardTask[]> = { today: [], tomorrow: [], later: [] };

  for (const task of tasks) buckets[dayOf(task, todayKey, tomorrowKey)].push(task);

  const dates: Record<DayKey, string | null> = {
    today: todayKey,
    tomorrow: tomorrowKey,
    later: null,
  };
  return (['today', 'tomorrow', 'later'] as const).map((key) => ({
    key,
    title: DAY_TITLES[key],
    date: dates[key],
    tasks: [...buckets[key]].sort(byDueDateAndTime),
  }));
}
