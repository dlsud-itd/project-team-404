import type {
  TaskRecurrence,
  TaskScheduleChanges,
} from '../../task-scheduling/types/task-scheduling.types';

/** A label attached to a task. */
export interface TaskLabel {
  labelId: number;
  name: string;
  /** Hex color such as #2563EB, or null for none. */
  color: string | null;
}

/** The priorities as the API names them. */
export type ApiTaskPriority = 'high' | 'medium' | 'low';

/** A task as /api/tasks sends it. See toTask for the shape the app uses. */
export interface ApiTask {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  priority: ApiTaskPriority;
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence | null;
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
  /** 1 is the highest priority, 3 the lowest (and the default). */
  priorityId: number;
  title: string;
  description: string | null;
  /** YYYY-MM-DD, or null when the task is unscheduled. */
  dueDate: string | null;
  /** ISO instant, never on a day before dueDate; instantToDate gives the day to show. */
  deadline: string | null;
  recurrence: TaskRecurrence;
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
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence;
}

/** Body of POST /api/tasks. */
export type CreateTaskBody = Omit<CreateTaskRequest, 'priorityId'> & {
  priority: ApiTaskPriority;
};

/** The details that changed in an edit. */
export interface UpdateTaskRequest {
  projectId?: number;
  title?: string;
  description?: string | null;
  priorityId?: number;
}

/** Body of PUT /api/tasks/{taskId}. */
export type UpdateTaskBody = Omit<UpdateTaskRequest, 'priorityId'> & {
  priority?: ApiTaskPriority;
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
  'title' | 'description' | 'priorityId' | 'projectId' | 'dueDate' | 'deadline' | 'recurrence';

/** A failed task request, turned into something a page can show. */
export interface TaskError {
  message: string;
  /** The form field the server rejected, when it can be told from the message. */
  field?: TaskField;
  /** The task no longer exists or belongs to someone else. */
  notFound: boolean;
}

export const TASK_TITLE_MAX_LENGTH = 200;
export const DEFAULT_TASK_PRIORITY = 3;

/** The fixed priority levels, highest first. */
export const TASK_PRIORITIES: readonly { priorityId: number; label: string }[] = [
  { priorityId: 1, label: 'High' },
  { priorityId: 2, label: 'Medium' },
  { priorityId: 3, label: 'Low' },
];

/** Each priority id's name in the API. */
export const PRIORITY_NAMES: Readonly<Record<number, ApiTaskPriority>> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};
