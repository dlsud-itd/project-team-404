import type {
  TaskRecurrence,
  TaskScheduleChanges,
  Weekday,
} from '../../task-scheduling/types/task-scheduling.types';

/** A label attached to a task. */
export interface TaskLabel {
  labelId: number;
  name: string;
  /** Hex color such as #2563EB, or null for none. */
  color: string | null;
}

/** The Sprint 3 priority names, still accepted and sent by older servers. */
export type ApiTaskPriority = 'high' | 'medium' | 'low';

/** A task's priority as Sprint 5 servers send it: one of the user's own levels. */
export interface ApiTaskPriorityLevel {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
}

/** How a request names a priority: by Sprint 3 name for older servers, otherwise by level id. */
export type PriorityField = { priority: ApiTaskPriority } | { priorityId: number };

/** A task as /api/tasks sends it. See toTask for the shape the app uses. */
export interface ApiTask {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  priority: ApiTaskPriority | ApiTaskPriorityLevel;
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence | null;
  /** 0 = Sunday … 6 = Saturday; may be missing from older servers. */
  recurrenceDays?: Weekday[];
  /** YYYY-MM-DD; may be missing from older servers. */
  recurrenceEndDate?: string | null;
  isDone: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
  labels: { id: number; name: string; color: string | null }[];
}

/** A task as the app uses it. */
export interface Task {
  taskId: number;
  projectId: number;
  /** One of the user's priority levels; PrioritiesStore has its name, color and order. */
  priorityId: number;
  title: string;
  description: string | null;
  /** YYYY-MM-DD, or null when the task is unscheduled. */
  scheduledDate: string | null;
  /** YYYY-MM-DD, or null when the task has no due date. */
  dueDate: string | null;
  /** ISO instant, never on a day before dueDate; instantToDate gives the day to show. */
  deadline: string | null;
  recurrence: TaskRecurrence;
  /** The weekdays a weekly task repeats on; empty for other repeats. */
  recurrenceDays: Weekday[];
  /** YYYY-MM-DD, the last day a repeating task may fall on; null repeats forever. */
  recurrenceEndDate: string | null;
  /** Completion timestamp, or null while the task is open. */
  completedAt: string | null;
  sortOrder: number;
  isRecurring: boolean;
  isArchived: boolean;
  labels: TaskLabel[];
}

/** A new task. Optional fields are null, never empty strings. */
export interface CreateTaskRequest {
  /** Omit to put the task in the Inbox. */
  projectId?: number;
  priorityId: number;
  title: string;
  description: string | null;
  scheduledDate?: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence;
  recurrenceDays: Weekday[];
  recurrenceEndDate: string | null;
}

/** Body of POST /api/tasks. */
export type CreateTaskBody = Omit<CreateTaskRequest, 'priorityId'> & PriorityField;

/** The details that changed in an edit. */
export interface UpdateTaskRequest {
  projectId?: number;
  title?: string;
  description?: string | null;
  priorityId?: number;
  completedAt?: string | null;
}

/** Body of PUT /api/tasks/{taskId}. */
export type UpdateTaskBody = Omit<UpdateTaskRequest, 'priorityId' | 'completedAt'> &
  Partial<{ priority: ApiTaskPriority; priorityId: number }> & {
    isDone?: boolean;
    doneAt?: string | null;
  };

export interface UpdateTaskResponse {
  taskId: number;
  message: string;
}

/** Everything an edit form can change, split by the service that saves it. */
export interface TaskChanges {
  details: UpdateTaskRequest;
  schedule: TaskScheduleChanges;
}

export interface DeleteTaskResponse {
  message: string;
}

export type TaskField =
  | 'title'
  | 'description'
  | 'priorityId'
  | 'projectId'
  | 'scheduledDate'
  | 'dueDate'
  | 'deadline'
  | 'recurrence'
  | 'recurrenceDays'
  | 'recurrenceEndDate';

/** A failed task request, turned into something a page can show. */
export interface TaskError {
  message: string;
  /** The form field the server rejected, when it can be told from the message. */
  field?: TaskField;
  /** The task no longer exists or belongs to someone else. */
  notFound: boolean;
}

export const TASK_TITLE_MAX_LENGTH = 200;

/**
 * The Sprint 3 name of each built-in level id (tbl_priority_level), for talking to servers that
 * predate per-user priorities. PrioritiesStore decides when these are used.
 */
export const PRIORITY_NAMES: Readonly<Record<number, ApiTaskPriority>> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};
