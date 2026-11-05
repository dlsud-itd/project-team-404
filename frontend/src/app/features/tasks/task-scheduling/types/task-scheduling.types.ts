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

/** A weekday as Date.getDay() numbers it: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The weekday checkboxes of a weekly repeat, Sunday first. */
export const WEEKDAYS: readonly { value: Weekday; short: string; name: string }[] = [
  { value: 0, short: 'Sun', name: 'Sunday' },
  { value: 1, short: 'Mon', name: 'Monday' },
  { value: 2, short: 'Tue', name: 'Tuesday' },
  { value: 3, short: 'Wed', name: 'Wednesday' },
  { value: 4, short: 'Thu', name: 'Thursday' },
  { value: 5, short: 'Fri', name: 'Friday' },
  { value: 6, short: 'Sat', name: 'Saturday' },
];

/** When a repeating task stops: never, or after an end date. */
export type RecurrenceEnds = 'never' | 'date';

/** The choices in the recurrence picker's Ends section. */
export const RECURRENCE_ENDS_OPTIONS: readonly { value: RecurrenceEnds; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'date', label: 'Date' },
];

/** The schedule fields that changed. A field set to null is cleared; a missing one is left alone. */
export interface TaskScheduleChanges {
  /** YYYY-MM-DD. */
  dueDate?: string | null;
  /** ISO instant. */
  deadline?: string | null;
  recurrence?: TaskRecurrence;
  /** Weekly repeats only; sent together with recurrence. */
  recurrenceDays?: Weekday[];
  /** YYYY-MM-DD, or null to repeat forever; sent together with recurrence. */
  recurrenceEndDate?: string | null;
}
