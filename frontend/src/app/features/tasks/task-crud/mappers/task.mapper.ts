import { PRIORITY_NAMES } from '../../shared/types/task.types';
import type {
  ApiTask,
  ApiTaskPriority,
  CreateTaskBody,
  CreateTaskRequest,
  Task,
  UpdateTaskBody,
  UpdateTaskRequest,
} from '../../shared/types/task.types';

function toPriorityId(priority: ApiTaskPriority): number {
  return Number(Object.keys(PRIORITY_NAMES).find((id) => PRIORITY_NAMES[+id] === priority));
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
    dueDate: task.dueDate,
    deadline: task.deadline,
    recurrence,
    completedAt: task.doneAt ?? (task.isDone ? task.updatedAt : null),
    sortOrder: 0,
    isRecurring: recurrence !== 'none',
    isArchived: false,
    labels: task.labels.map(({ id, name, color }) => ({ labelId: id, name, color })),
  };
}

export function toCreateTaskBody({ priorityId, ...rest }: CreateTaskRequest): CreateTaskBody {
  return { ...rest, priority: PRIORITY_NAMES[priorityId] };
}

export function toUpdateTaskBody({ priorityId, ...rest }: UpdateTaskRequest): UpdateTaskBody {
  return priorityId === undefined ? rest : { ...rest, priority: PRIORITY_NAMES[priorityId] };
}
