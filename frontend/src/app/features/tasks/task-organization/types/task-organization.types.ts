import type { ApiLabel } from '../../../labels/types/label.types';

/**
 * A task's priority as the organization endpoints name it (PUT /api/tasks/{id}/priority and the
 * `priority` filter of GET /api/tasks).
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/** What the tasks list can be ordered by (GET /api/tasks `orderBy`). */
export type TaskOrderBy = 'dueDate' | 'createdAt' | 'priority' | 'title';
export type TaskOrderDirection = 'asc' | 'desc';

/** The filters and ordering a user can set on a task list. null means "not filtered". */
export interface TaskFilters {
  priority: TaskPriority | null;
  labelId: number | null;
  /** null keeps the server's default order (due date, then newest). */
  orderBy: TaskOrderBy | null;
  orderDirection: TaskOrderDirection;
}

export const DEFAULT_TASK_FILTERS: Readonly<TaskFilters> = {
  priority: null,
  labelId: null,
  orderBy: null,
  orderDirection: 'asc',
};

export const TASK_ORDER_OPTIONS: readonly { value: TaskOrderBy; label: string }[] = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Date added' },
];

/** Body of PUT /api/tasks/{taskId}/priority. */
export interface SetTaskPriorityRequest {
  priority: TaskPriority;
}

/** The parts of PUT /api/tasks/{taskId}/priority's reply (the updated task) that are used. */
export interface SetTaskPriorityResponse {
  id: number;
  priority: TaskPriority;
}

/** Body of POST /api/tasks/{taskId}/labels. */
export interface AttachTaskLabelsRequest {
  labelIds: number[];
}

/** Reply of POST /api/tasks/{id}/labels and DELETE /api/tasks/{id}/labels/{labelId}. */
export interface TaskLabelsResponse {
  labels: ApiLabel[];
}
