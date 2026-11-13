import type { Task } from '../../../tasks/shared/types/task.types';
import { DAY_GROUPS, type DayGroupKey, type TaskDayGroup } from '../types/current-upcoming.types';

/** "2026-12-31" plus one day → "2027-01-01". Works on calendar dates, so no timezone shifts. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function groupFor(dueDate: string, today: string, tomorrow: string): DayGroupKey | null {
  if (dueDate === today) return 'today';
  if (dueDate === tomorrow) return 'tomorrow';
  // YYYY-MM-DD strings sort as dates. Earlier days belong to the Overdue section.
  return dueDate > tomorrow ? 'later' : null;
}

/**
 * Splits tasks into Today, Tomorrow and Later by due date, where `today` is the user's local
 * date (YYYY-MM-DD). Always returns all three groups in that order, each sorted by due date with
 * the input order kept for ties. Unscheduled tasks and tasks due before today are left out.
 */
export function groupByDay(tasks: readonly Task[], today: string): TaskDayGroup[] {
  const tomorrow = addDays(today, 1);
  const buckets: Record<DayGroupKey, Task[]> = { today: [], tomorrow: [], later: [] };

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = groupFor(task.dueDate, today, tomorrow);
    if (key) buckets[key].push(task);
  }
  // Array.prototype.sort is stable, so same-day tasks keep the server's order.
  buckets.later.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0));

  return DAY_GROUPS.map((group) => ({ ...group, tasks: buckets[group.key] }));
}

/** The message for a day whose tasks are all past the widget's limit. */
export const HIDDEN_GROUP_MESSAGE = 'More tasks under View all.';

/**
 * Keeps the first `limit` tasks across the groups, in group order. A group emptied by the limit
 * says its tasks are under View all instead of claiming there are none.
 */
export function limitGroups(groups: readonly TaskDayGroup[], limit: number): TaskDayGroup[] {
  let room = Math.max(0, limit);
  return groups.map((group) => {
    const tasks = group.tasks.slice(0, room);
    room -= tasks.length;
    if (tasks.length === group.tasks.length) return group;
    return {
      ...group,
      tasks,
      emptyMessage: tasks.length ? group.emptyMessage : HIDDEN_GROUP_MESSAGE,
    };
  });
}
