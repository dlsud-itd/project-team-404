import type { TaskRecord } from '../../tasks/shared/models/task.model';
import { toDashboardTask } from './models/dashboard-task.model';
import { getDateWindow } from '../shared/utils/date-window.util';

export type CurrentUpcomingTasksDependencies = {
  findUserTimezone(userId: string): Promise<string | null>;
  listTasksDueBetween(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TaskRecord[]>;
};

export class CurrentUpcomingTasksService {
  constructor(
    private readonly dependencies: CurrentUpcomingTasksDependencies,
    private readonly now: () => Date = () => new Date()
  ) {}

  async list(userId: string, days: number) {
    const timeZone =
      (await this.dependencies.findUserTimezone(userId)) ?? 'UTC';
    const window = getDateWindow(timeZone, days, this.now());
    const tasks = await this.dependencies.listTasksDueBetween(
      userId,
      window.startDate,
      window.endDate
    );
    return tasks.map(toDashboardTask);
  }
}
