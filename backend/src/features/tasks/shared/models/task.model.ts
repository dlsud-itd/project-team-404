import type { Task as PrismaTask } from '@prisma/client';

export type TaskRecord = PrismaTask;
export type Task = Omit<
  TaskRecord,
  'userId' | 'deletedAt' | 'dueDate' | 'doneAt'
> & {
  dueDate: string | null;
  doneAt: string | null;
};
export type TaskPriority = 'low' | 'medium' | 'high';

export function toTaskModel(task: TaskRecord): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : null,
    isDone: task.isDone,
    doneAt: task.doneAt ? new Date(task.doneAt).toISOString() : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  };
}
