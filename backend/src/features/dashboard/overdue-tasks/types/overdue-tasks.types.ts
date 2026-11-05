import type { DashboardTask } from '../../current-upcoming-tasks/models/dashboard-task.model';

export type OverdueTasksResponse = {
  tasks: DashboardTask[];
};
