/** A label attached to a task (API spec v1.1, III.A). */
export interface TaskLabel {
  labelId: number;
  name: string;
  /** Hex color such as #2563EB, or null for none. */
  color: string | null;
}

/** A task as returned by /api/tasks (API spec v1.1, section III). */
export interface Task {
  taskId: number;
  projectId: number;
  /** 1 is the highest priority, 4 the lowest (and the default). */
  priorityId: number;
  title: string;
  description: string | null;
  /** YYYY-MM-DD, or null when the task is unscheduled. */
  dueDate: string | null;
  /** HH:mm:ss, or null. Only set when dueDate is. */
  dueTime: string | null;
  /** YYYY-MM-DD, never earlier than dueDate. */
  deadline: string | null;
  /** Completion timestamp, or null while the task is open. */
  completedAt: string | null;
  sortOrder: number;
  isRecurring: boolean;
  isArchived: boolean;
  labels: TaskLabel[];
}

/** Body of POST /api/tasks. Optional fields are sent as null, never as empty strings. */
export interface CreateTaskRequest {
  /** Omit to put the task in the Inbox. */
  projectId?: number;
  priorityId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  deadline: string | null;
}

/** What POST /api/tasks returns: a task without its labels, completion or recurrence. */
export type CreateTaskResponse = Omit<Task, 'completedAt' | 'isRecurring' | 'labels'>;

/** Body of PUT /api/tasks/{taskId}: only the details that changed. */
export interface UpdateTaskRequest {
  projectId?: number;
  title?: string;
  description?: string | null;
  priorityId?: number;
}

export interface UpdateTaskResponse {
  taskId: number;
  message: string;
}

/** Body of PUT /api/tasks/{taskId}/schedule (API spec IV.C): only the fields that changed. */
export interface RescheduleTaskRequest {
  dueDate?: string | null;
  dueTime?: string | null;
  deadline?: string | null;
}

export interface RescheduleTaskResponse {
  taskId: number;
  dueDate: string | null;
  dueTime: string | null;
  deadline: string | null;
  status: string;
  message: string;
}

/** Everything an edit form can change, split by the endpoint that changes it. */
export interface TaskChanges {
  details: UpdateTaskRequest;
  schedule: RescheduleTaskRequest;
}

export interface DeleteTaskResponse {
  message: string;
}

export type TaskField =
  'title' | 'description' | 'priorityId' | 'projectId' | 'dueDate' | 'dueTime' | 'deadline';

/** A failed task request, turned into something a page can show. */
export interface TaskError {
  message: string;
  /** The form field the server rejected, when it can be told from the message. */
  field?: TaskField;
  /** The task no longer exists or belongs to someone else. */
  notFound: boolean;
}

export const TASK_TITLE_MAX_LENGTH = 200;
export const DEFAULT_TASK_PRIORITY = 4;

/** The fixed priority levels (API spec V.A), highest first. */
export const TASK_PRIORITIES: readonly { priorityId: number; label: string }[] = [
  { priorityId: 1, label: 'Priority 1' },
  { priorityId: 2, label: 'Priority 2' },
  { priorityId: 3, label: 'Priority 3' },
  { priorityId: 4, label: 'Priority 4' },
];
