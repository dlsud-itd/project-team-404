import { Injectable, computed, signal } from '@angular/core';
import type { Project as ApiProject } from '../projects/shared/types/project.types';
import type { Task as ApiTask } from '../tasks/shared/types/task.types';

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'current' | 'upcoming' | 'overdue' | 'done' | 'unscheduled';

export interface Project {
  id: number;
  name: string;
  color: string | null;
}

export interface Task {
  id: number;
  title: string;
  projectId: number | null;
  priority: Priority;
  /** Local date, YYYY-MM-DD, or null when the task has no due date. */
  due: string | null;
  done: boolean;
  isRecurring?: boolean;
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

const PRIORITY_BY_ID: Readonly<Record<number, Priority>> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};

/** Formats a date as a local YYYY-MM-DD string. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function completionDate(completedAt: string | null): string | undefined {
  return completedAt ? toDateKey(new Date(completedAt)) : undefined;
}

function fromApiTask(task: ApiTask): Task {
  return {
    id: task.taskId,
    title: task.title,
    projectId: task.projectId || null,
    priority: PRIORITY_BY_ID[task.priorityId] ?? 'low',
    due: task.dueDate,
    done: task.completedAt !== null,
    isRecurring: task.recurrence !== 'none',
    doneOn: completionDate(task.completedAt),
  };
}

@Injectable()
export class DashboardStore {
  private readonly projectList = signal<Project[]>([]);
  private readonly taskList = signal<Task[]>([]);

  readonly projects = this.projectList.asReadonly();
  readonly tasks = this.taskList.asReadonly();
  readonly filter = signal<TaskFilter>({});
  readonly today = signal(toDateKey(new Date()));
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly openTasks = computed(() => this.taskList().filter((task) => !task.done));
  readonly doneToday = computed(
    () => this.taskList().filter((task) => task.done && task.doneOn === this.today()).length,
  );

  readonly byStatus = computed(() => {
    const groups: Record<TaskStatus, Task[]> = {
      current: [],
      upcoming: [],
      overdue: [],
      done: [],
      unscheduled: [],
    };
    for (const task of this.filteredTasks()) groups[this.statusOf(task)].push(task);
    return groups;
  });

  readonly overdueCount = computed(
    () => this.openTasks().filter((task) => this.statusOf(task) === 'overdue').length,
  );

  readonly filteredTasks = computed(() => {
    const { projectId, priority, due } = this.filter();
    return this.taskList()
      .filter((task) => projectId === undefined || task.projectId === projectId)
      .filter((task) => priority === undefined || task.priority === priority)
      .filter((task) => due === undefined || task.due === due)
      .sort(
        (left, right) =>
          Number(left.done) - Number(right.done) ||
          (left.due ?? '9999-12-31').localeCompare(right.due ?? '9999-12-31') ||
          left.id - right.id,
      );
  });

  /** Tasks with due dates, grouped for the calendar. */
  readonly tasksByDay = computed(() => {
    const days = new Map<string, Task[]>();
    for (const task of this.taskList()) {
      if (task.due) days.set(task.due, [...(days.get(task.due) ?? []), task]);
    }
    return days;
  });

  /** Open tasks per project id. */
  readonly projectCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const task of this.openTasks()) {
      if (task.projectId !== null) {
        counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1);
      }
    }
    return counts;
  });

  readonly priorityCounts = computed(() => {
    const counts: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    for (const task of this.openTasks()) counts[task.priority]++;
    return counts;
  });

  startLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  setData(projects: readonly ApiProject[], tasks: readonly ApiTask[]): void {
    this.projectList.set(
      projects
        .filter((project) => !project.isArchived)
        .map(({ projectId, name, color }) => ({ id: projectId, name, color })),
    );
    this.taskList.set(tasks.map(fromApiTask));
    this.loading.set(false);
    this.loaded.set(true);
    this.error.set(null);
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  upsertTask(task: ApiTask): void {
    const next = fromApiTask(task);
    this.taskList.update((tasks) =>
      tasks.some((item) => item.id === next.id)
        ? tasks.map((item) => (item.id === next.id ? next : item))
        : [...tasks, next],
    );
  }

  setTaskCompletion(taskId: number, completedAt: string | null): void {
    this.taskList.update((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              done: completedAt !== null,
              doneOn: completionDate(completedAt),
            }
          : task,
      ),
    );
  }

  removeTask(taskId: number): void {
    this.taskList.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  statusOf(task: Task): TaskStatus {
    if (task.done) return 'done';
    if (!task.due) return 'unscheduled';
    if (task.due > this.today()) return 'upcoming';
    return task.due === this.today() ? 'current' : 'overdue';
  }

  projectById(id: number | null): Project | undefined {
    return this.projectList().find((project) => project.id === id);
  }
}
