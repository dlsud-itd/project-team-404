import type { Task, TaskRecord } from '../../../tasks/shared/models/task.model';
import { toTaskModel } from '../../../tasks/shared/models/task.model';

export type DashboardTask = Task;

export function toDashboardTask(task: TaskRecord): DashboardTask {
  return toTaskModel(task);
}
