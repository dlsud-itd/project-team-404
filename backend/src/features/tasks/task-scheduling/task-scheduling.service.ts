import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type { TaskRecord } from '../shared/models/task.model';
import { toTaskModel } from '../shared/models/task.model';
import type { TaskScheduleUpdateInput } from './task-scheduling.types';

export type TaskSchedulingDependencies = {
  updateTaskSchedule: (
    taskId: number,
    userId: string,
    input: TaskScheduleUpdateInput
  ) => Promise<TaskRecord | null>;
};

export class TaskSchedulingService {
  constructor(private readonly dependencies: TaskSchedulingDependencies) {}

  async setScheduledDate(
    task: TaskRecord,
    userId: string,
    scheduledDate: string | null
  ) {
    const updated = await this.dependencies.updateTaskSchedule(
      task.id,
      userId,
      {
        scheduledDate,
      }
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }

  async setDueDate(task: TaskRecord, userId: string, dueDate: string | null) {
    const updated = await this.dependencies.updateTaskSchedule(
      task.id,
      userId,
      {
        dueDate,
      }
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }

  async setDeadline(task: TaskRecord, userId: string, deadline: string | null) {
    const updated = await this.dependencies.updateTaskSchedule(
      task.id,
      userId,
      {
        deadline,
      }
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }

  async setRecurrence(
    task: TaskRecord,
    userId: string,
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null
  ) {
    const updated = await this.dependencies.updateTaskSchedule(
      task.id,
      userId,
      {
        recurrence,
      }
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }
}
