import type { Task as PrismaTask } from '@prisma/client';

export type TaskRecord = PrismaTask;
export type Task = Omit<
  TaskRecord,
  'userId' | 'deletedAt' | 'scheduledDate' | 'dueDate' | 'deadline' | 'doneAt'
> & {
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence | null;
  doneAt: string | null;
};
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export function toTaskModel(task: TaskRecord): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    scheduledDate: task.scheduledDate
      ? new Date(task.scheduledDate).toISOString().slice(0, 10)
      : null,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : null,
    deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
    recurrence: task.recurrence ?? null,
    isDone: task.isDone,
    doneAt: task.doneAt ? new Date(task.doneAt).toISOString() : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  };
}
