import type { Prisma } from '@prisma/client';

export type TaskRecord = Prisma.TaskGetPayload<{
  include: {
    priorityLevel: true;
    taskLabels: { include: { label: true } };
  };
}>;
export type Task = Omit<
  TaskRecord,
  | 'userId'
  | 'deletedAt'
  | 'scheduledDate'
  | 'dueDate'
  | 'deadline'
  | 'doneAt'
  | 'priorityId'
  | 'priorityLevel'
  | 'taskLabels'
> & {
  priority: TaskPriority;
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: TaskRecurrence | null;
  doneAt: string | null;
  labels: Label[];
};
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type Label = {
  id: number;
  name: string;
  color: string | null;
};

export function toTaskModel(task: TaskRecord): Task {
  const priority = task.priorityLevel.name;
  if (!isTaskPriority(priority)) {
    throw new Error(`Unsupported task priority: ${priority}`);
  }

  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority,
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
    labels: task.taskLabels.map(({ label }) => ({
      id: label.id,
      name: label.name,
      color: label.color?.trim() || null,
    })),
  };
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}
