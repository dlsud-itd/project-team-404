import { PRIORITY_NAMES } from '../types/task.types';
import type { ApiTask, Task } from '../types/task.types';

/** A task as the API sends it, for flushing realistic replies in specs. */
export function asApiTask(task: Task): ApiTask {
  return {
    id: task.taskId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: PRIORITY_NAMES[task.priorityId],
    scheduledDate: null,
    dueDate: task.dueDate,
    deadline: task.deadline,
    recurrence: task.recurrence,
    isDone: task.completedAt !== null,
    doneAt: task.completedAt,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    labels: task.labels.map(({ labelId, name, color }) => ({ id: labelId, name, color })),
  };
}
