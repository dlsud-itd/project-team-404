import type { Task } from '../../../tasks/shared/types/task.types';

/** The day buckets of the Current & Upcoming section, in display order. */
export type DayGroupKey = 'today' | 'tomorrow' | 'later';

export interface TaskDayGroup {
  key: DayGroupKey;
  label: string;
  /** Shown when the group has no tasks. */
  emptyMessage: string;
  tasks: Task[];
}

export const DAY_GROUPS: readonly Omit<TaskDayGroup, 'tasks'>[] = [
  { key: 'today', label: 'Today', emptyMessage: 'Nothing due today.' },
  { key: 'tomorrow', label: 'Tomorrow', emptyMessage: 'Nothing due tomorrow.' },
  { key: 'later', label: 'Later', emptyMessage: 'Nothing else due this week.' },
];
