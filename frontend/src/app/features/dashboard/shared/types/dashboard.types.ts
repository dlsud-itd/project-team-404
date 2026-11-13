import type { ApiTask, Task } from '../../../tasks/shared/types/task.types';

/** Body of GET /api/dashboard/current-upcoming-tasks and GET /api/dashboard/overdue-tasks. */
export interface DashboardTasksResponse {
  tasks: ApiTask[];
  /** Sprint 5: every matching task before the server's limit. Older servers leave it out. */
  total?: number;
}

/** A dashboard list: the tasks sent, and how many match in all. */
export interface DashboardTaskList {
  tasks: Task[];
  /** At least tasks.length; more when the server capped the list. */
  total: number;
}

/** How many days after today the current & upcoming list covers when no count is given. */
export const DEFAULT_UPCOMING_DAYS = 7;
/** The most days the API accepts for the current & upcoming list. */
export const MAX_UPCOMING_DAYS = 30;

/** A failed dashboard request, turned into something a section can show. */
export interface DashboardError {
  message: string;
}
