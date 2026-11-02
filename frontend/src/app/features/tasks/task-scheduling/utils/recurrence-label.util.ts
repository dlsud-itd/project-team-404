import type { TaskRecurrence } from '../types/task-scheduling.types';

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
