import type { DashboardTask } from '../../shared/types/dashboard.types';

/** The day buckets of the Current & upcoming section, in the order they are shown. */
export type DayKey = 'today' | 'tomorrow' | 'later';

export interface DayGroup {
  key: DayKey;
  /** "Today", "Tomorrow" or "Later". */
  title: string;
  /** The day as YYYY-MM-DD for Today and Tomorrow; null for Later, which spans many days. */
  date: string | null;
  tasks: DashboardTask[];
}

export const DAY_TITLES: Readonly<Record<DayKey, string>> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  later: 'Later',
};
