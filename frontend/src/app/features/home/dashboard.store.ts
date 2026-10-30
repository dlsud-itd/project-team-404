import { Injectable, computed, signal } from '@angular/core';

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'current' | 'upcoming' | 'overdue' | 'done';

export interface Project {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  projectId: number | null;
  priority: Priority;
  /** Local date, YYYY-MM-DD. */
  due: string;
  done: boolean;
  /** Local date the task was completed, YYYY-MM-DD. */
  doneOn?: string;
}

export interface TaskFilter {
  projectId?: number;
  priority?: Priority;
  /** Local date, YYYY-MM-DD: only tasks due that day. Set by the calendar. */
  due?: string;
}

export const PRIORITIES: { value: Priority; label: string; hint?: string }[] = [
  { value: 'high', label: 'High', hint: 'Do these first' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const PROJECT_COLORS = ['#1f9d3a', '#1a1ae6', '#d9531e', '#7b23a8', '#e0a100', '#0f8b8d'];

/** Formats a date as a local YYYY-MM-DD string. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

/**
 * Dashboard state for the signed-in user.
 * TODO(Sprint 2): load and save projects and tasks through the API instead of sample data.
 */
@Injectable()
export class DashboardStore {
  private nextId = 100;

  private readonly projectList = signal<Project[]>([
    { id: 1, name: 'School', color: PROJECT_COLORS[0] },
    { id: 2, name: 'Work', color: PROJECT_COLORS[1] },
    { id: 3, name: 'Personal', color: PROJECT_COLORS[2] },
  ]);

  private readonly taskList = signal<Task[]>([
    {
      id: 1,
      title: 'Submit lab report',
      projectId: 1,
      priority: 'high',
      due: daysFromToday(-2),
      done: false,
    },
    {
      id: 2,
      title: 'Reply to client email',
      projectId: 2,
      priority: 'medium',
      due: daysFromToday(-1),
      done: false,
    },
    {
      id: 3,
      title: 'Read chapter 4',
      projectId: 1,
      priority: 'medium',
      due: daysFromToday(0),
      done: false,
    },
    {
      id: 4,
      title: 'Team stand-up notes',
      projectId: 2,
      priority: 'low',
      due: daysFromToday(0),
      done: false,
    },
    {
      id: 5,
      title: 'Gym session',
      projectId: 3,
      priority: 'low',
      due: daysFromToday(0),
      done: true,
      doneOn: daysFromToday(0),
    },
    {
      id: 6,
      title: 'Study for quiz',
      projectId: 1,
      priority: 'high',
      due: daysFromToday(2),
      done: false,
    },
    {
      id: 7,
      title: 'Prepare sprint demo',
      projectId: 2,
      priority: 'high',
      due: daysFromToday(3),
      done: false,
    },
    {
      id: 8,
      title: 'Call grandma',
      projectId: 3,
      priority: 'medium',
      due: daysFromToday(4),
      done: false,
    },
    {
      id: 9,
      title: 'Plan weekend trip',
      projectId: 3,
      priority: 'low',
      due: daysFromToday(6),
      done: false,
    },
  ]);

  readonly projects = this.projectList.asReadonly();
  readonly tasks = this.taskList.asReadonly();
  readonly filter = signal<TaskFilter>({});
  readonly streakDays = signal(7);

  readonly today = signal(toDateKey(new Date()));

  readonly openTasks = computed(() => this.taskList().filter((t) => !t.done));
  readonly doneToday = computed(
    () => this.taskList().filter((t) => t.done && t.doneOn === this.today()).length,
  );

  readonly byStatus = computed(() => {
    const groups: Record<TaskStatus, Task[]> = { current: [], upcoming: [], overdue: [], done: [] };
    for (const task of this.filteredTasks()) groups[this.statusOf(task)].push(task);
    return groups;
  });

  readonly overdueCount = computed(
    () => this.openTasks().filter((t) => this.statusOf(t) === 'overdue').length,
  );

  readonly filteredTasks = computed(() => {
    const { projectId, priority, due } = this.filter();
    return this.taskList()
      .filter((t) => projectId === undefined || t.projectId === projectId)
      .filter((t) => priority === undefined || t.priority === priority)
      .filter((t) => due === undefined || t.due === due)
      .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  });

  /** Every task, grouped by due date, for the calendar. */
  readonly tasksByDay = computed(() => {
    const days = new Map<string, Task[]>();
    for (const task of this.taskList()) days.set(task.due, [...(days.get(task.due) ?? []), task]);
    return days;
  });

  /** Open tasks per project id. */
  readonly projectCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const t of this.openTasks()) {
      if (t.projectId !== null) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    }
    return counts;
  });

  readonly priorityCounts = computed(() => {
    const counts: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    for (const t of this.openTasks()) counts[t.priority]++;
    return counts;
  });

  statusOf(task: Task): TaskStatus {
    if (task.done) return 'done';
    if (task.due < this.today()) return 'overdue';
    return task.due === this.today() ? 'current' : 'upcoming';
  }

  projectById(id: number | null): Project | undefined {
    return this.projectList().find((p) => p.id === id);
  }

  addProject(name: string): void {
    const color = PROJECT_COLORS[this.projectList().length % PROJECT_COLORS.length];
    this.projectList.update((list) => [...list, { id: this.nextId++, name, color }]);
  }

  renameProject(id: number, name: string): void {
    this.projectList.update((list) => list.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  /** Removes a project; its tasks stay, without a project. */
  deleteProject(id: number): void {
    this.projectList.update((list) => list.filter((p) => p.id !== id));
    this.taskList.update((list) =>
      list.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    );
    if (this.filter().projectId === id) this.filter.set({});
  }

  addTask(task: Omit<Task, 'id' | 'done'>): void {
    this.taskList.update((list) => [...list, { ...task, id: this.nextId++, done: false }]);
  }

  toggleTask(id: number): void {
    const today = this.today();
    this.taskList.update((list) =>
      list.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneOn: t.done ? undefined : today } : t,
      ),
    );
  }

  deleteTask(id: number): void {
    this.taskList.update((list) => list.filter((t) => t.id !== id));
  }
}
