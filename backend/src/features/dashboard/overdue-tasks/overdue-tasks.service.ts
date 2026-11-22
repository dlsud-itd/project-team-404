import type { TaskRecord } from '../../tasks/shared/models/task.model';
import { toDashboardTask } from '../current-upcoming-tasks/models/dashboard-task.model';
import { getDateWindow } from '../shared/utils/date-window.util';

export type OverdueTasksDependencies = {
  findUserTimezone(userId: string): Promise<string | null>;
  listOverdueTasks(userId: string, before: Date): Promise<TaskRecord[]>;
};

export class OverdueTasksService {
  constructor(
    private readonly dependencies: OverdueTasksDependencies,
    private readonly now: () => Date = () => new Date()
  ) {}

  async list(userId: string) {
    const timeZone =
      (await this.dependencies.findUserTimezone(userId)) ?? 'UTC';
    const now = this.now();
    getDateWindow(timeZone, 0, now);

    const tasks = await this.dependencies.listOverdueTasks(userId, now);
    return tasks.map(toDashboardTask);
  }
}
