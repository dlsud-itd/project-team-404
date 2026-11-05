import type { DashboardTask, DashboardTasksResponse } from '../../shared/types/dashboard.types';

let nextId = 1;

/** An open, upcoming, undated task with any field overridden. Ids count up per call. */
export function dashboardTask(overrides: Partial<DashboardTask> = {}): DashboardTask {
  const taskId = overrides.taskId ?? nextId++;
  return {
    taskId,
    projectId: 10,
    priorityId: 4,
    title: `Task ${taskId}`,
    description: null,
    dueDate: null,
    dueTime: null,
    deadline: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
    status: 'upcoming',
    ...overrides,
  };
}

/** A GET /api/dashboard/tasks reply with every task in one ungrouped group. */
export function tasksResponse(tasks: DashboardTask[]): DashboardTasksResponse {
  return {
    view: {
      layout: 'list',
      sortBy: 'dueDate',
      sortDirection: 'ASC',
      groupBy: 'none',
      groupDirection: 'ASC',
    },
    totalCount: tasks.length,
    groups: [{ key: 'none', name: 'All tasks', taskCount: tasks.length, tasks }],
  };
}
