import { PRIORITY_NAMES } from '../../shared/types/task.types';
import type {
  ApiTask,
  ApiTaskPriority,
  ApiTaskPriorityLevel,
  CreateTaskBody,
  PriorityField,
  CreateTaskRequest,
  Task,
  UpdateTaskBody,
  UpdateTaskRequest,
} from '../../shared/types/task.types';

/** Finds the Sprint 3 name for a level id, or undefined when the level must be sent by id. */
export type LegacyPriorityLookup = (priorityId: number) => ApiTaskPriority | undefined;

const builtInName: LegacyPriorityLookup = (priorityId) => PRIORITY_NAMES[priorityId];

function toPriorityId(priority: ApiTaskPriority | ApiTaskPriorityLevel): number {
  if (typeof priority === 'object') return priority.id;
  return Number(Object.keys(PRIORITY_NAMES).find((id) => PRIORITY_NAMES[+id] === priority));
}

function priorityField(priorityId: number, legacyName: LegacyPriorityLookup): PriorityField {
  const name = legacyName(priorityId);
  return name ? { priority: name } : { priorityId };
}

/**
 * Turns a task from the API into the shape the app uses. The API has no sort order or archiving
 * for tasks, so those get fixed values and the list falls back to id order.
 */
export function toTask(task: ApiTask): Task {
  const recurrence = task.recurrence ?? 'none';
  return {
    taskId: task.id,
    // A task loses its project when that project is deleted; 0 is never a real project id.
    projectId: task.projectId ?? 0,
    priorityId: toPriorityId(task.priority),
    title: task.title,
    description: task.description,
    scheduledDate: task.scheduledDate,
    dueDate: task.dueDate,
    deadline: task.deadline,
    recurrence,
    recurrenceDays: recurrence === 'weekly' ? (task.recurrenceDays ?? []) : [],
    recurrenceEndDate: recurrence === 'none' ? null : (task.recurrenceEndDate ?? null),
    completedAt: task.doneAt ?? (task.isDone ? task.updatedAt : null),
    sortOrder: 0,
    isRecurring: recurrence !== 'none',
    isArchived: false,
    labels: task.labels.map(({ id, name, color }) => ({ labelId: id, name, color })),
  };
}

export function toCreateTaskBody(
  { priorityId, ...rest }: CreateTaskRequest,
  legacyName: LegacyPriorityLookup = builtInName,
): CreateTaskBody {
  return { ...rest, ...priorityField(priorityId, legacyName) };
}

export function toUpdateTaskBody(
  { priorityId, completedAt, ...rest }: UpdateTaskRequest,
  legacyName: LegacyPriorityLookup = builtInName,
): UpdateTaskBody {
  return {
    ...rest,
    ...(priorityId === undefined ? {} : priorityField(priorityId, legacyName)),
    ...(completedAt === undefined ? {} : { isDone: completedAt !== null, doneAt: completedAt }),
  };
}
