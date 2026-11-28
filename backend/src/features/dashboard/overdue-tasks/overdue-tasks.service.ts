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
    // A task is overdue once its end date is behind the user's today.
    const { startDate: today } = getDateWindow(timeZone, 0, this.now());

    const tasks = await this.dependencies.listOverdueTasks(
      userId,
      new Date(`${today}T00:00:00.000Z`)
    );
    return tasks.map(toDashboardTask);
  }
}
