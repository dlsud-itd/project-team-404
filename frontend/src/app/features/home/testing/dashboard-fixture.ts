import type { ApiProject, Project } from '../../projects/shared/types/project.types';
import type { ApiTask, Task } from '../../tasks/shared/types/task.types';

export const DASHBOARD_PROJECTS: Project[] = [
  {
    projectId: 4,
    name: 'Inbox',
    description: null,
    color: null,
    isInbox: true,
    isFavorite: false,
    isArchived: false,
    sortOrder: -1,
  },
  {
    projectId: 1,
    name: 'School',
    description: null,
    color: '#1f9d3a',
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    sortOrder: 0,
  },
  {
    projectId: 2,
    name: 'Work',
    description: null,
    color: '#1a1ae6',
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    sortOrder: 1,
  },
  {
    projectId: 3,
    name: 'Personal',
    description: null,
    color: '#d9531e',
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    sortOrder: 2,
  },
];

export const DASHBOARD_TASKS: Task[] = [
  task(1, 'Submit lab report', 1, 1, '2026-10-28'),
  task(2, 'Reply to client email', 2, 2, '2026-10-29'),
  task(3, 'Read chapter 4', 1, 2, '2026-10-30'),
  task(4, 'Team stand-up notes', 2, 3, '2026-10-30'),
  task(5, 'Gym session', 3, 3, '2026-10-30', true),
  task(6, 'Study for quiz', 1, 1, '2026-11-01'),
  task(7, 'Prepare sprint demo', 2, 1, '2026-11-02'),
  task(8, 'Call grandma', 3, 2, '2026-11-03'),
  task(9, 'Plan weekend trip', 3, 3, '2026-11-05'),
];

export function task(
  taskId: number,
  title: string,
  projectId: number,
  priorityId: number,
  dueDate: string | null,
  done = false,
): Task {
  return {
    taskId,
    projectId,
    priorityId,
    title,
    description: null,
    scheduledDate: null,
    dueDate,
    deadline: null,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: done ? new Date(2026, 9, 30, 10).toISOString() : null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
  };
}

export function apiProjects(): ApiProject[] {
  return DASHBOARD_PROJECTS.map(({ projectId, ...project }) => ({ id: projectId, ...project }));
}

export function apiTasks(): ApiTask[] {
  return DASHBOARD_TASKS.map((task) => ({
    id: task.taskId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priorityId === 1 ? 'high' : task.priorityId === 2 ? 'medium' : 'low',
    scheduledDate: null,
    dueDate: task.dueDate,
    deadline: task.deadline,
    recurrence: task.recurrence,
    isDone: task.completedAt !== null,
    doneAt: task.completedAt,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    labels: [],
  }));
}
