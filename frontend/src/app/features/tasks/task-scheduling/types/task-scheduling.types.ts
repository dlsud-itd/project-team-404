/** How often a task repeats, as the API names it. */
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export const DEFAULT_TASK_RECURRENCE: TaskRecurrence = 'none';

/** The choices in the recurrence picker. */
export const RECURRENCE_OPTIONS: readonly { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** The schedule fields that changed. A field set to null is cleared; a missing one is left alone. */
export interface TaskScheduleChanges {
  /** YYYY-MM-DD. */
  dueDate?: string | null;
  /** ISO instant. */
  deadline?: string | null;
  recurrence?: TaskRecurrence;
}
