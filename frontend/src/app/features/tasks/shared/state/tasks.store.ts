import { Injectable, computed, signal } from '@angular/core';
import type { Task } from '../types/task.types';

/** By sortOrder, then by id so the order is stable. */
function byDisplayOrder(a: Task, b: Task): number {
  return a.sortOrder - b.sortOrder || a.taskId - b.taskId;
}

/**
 * The tasks of the project the user is looking at, shared by every tasks subfeature. It only
 * holds state; the services that call the API write to it.
 */
@Injectable({ providedIn: 'root' })
export class TasksStore {
  private readonly list = signal<Task[]>([]);

  /** The project whose tasks were last loaded, or null before any load. */
  readonly projectId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** True once a list request for projectId has succeeded. */
  readonly loaded = signal(false);

  /** Active tasks of the current project. Tasks moved to another project drop out. */
  readonly tasks = computed(() =>
    this.list()
      .filter((t) => t.projectId === this.projectId() && !t.isArchived)
      .sort(byDisplayOrder),
  );
  readonly open = computed(() => this.tasks().filter((t) => t.completedAt === null));
  readonly completed = computed(() => this.tasks().filter((t) => t.completedAt !== null));

  byId(taskId: number): Task | undefined {
    return this.list().find((t) => t.taskId === taskId);
  }

  /** Starts loading a project's tasks. Switching projects drops the old project's tasks. */
  startLoading(projectId: number): void {
    if (projectId !== this.projectId()) {
      this.list.set([]);
      this.loaded.set(false);
      this.projectId.set(projectId);
    }
    this.loading.set(true);
    this.error.set(null);
  }

  setTasks(projectId: number, tasks: Task[]): void {
    this.projectId.set(projectId);
    this.list.set(tasks);
    this.loading.set(false);
    this.loaded.set(true);
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  /** Adds a task, or replaces the one with the same id. */
  upsert(task: Task): void {
    this.list.update((list) =>
      list.some((t) => t.taskId === task.taskId)
        ? list.map((t) => (t.taskId === task.taskId ? task : t))
        : [...list, task],
    );
  }

  patch(taskId: number, changes: Partial<Task>): void {
    this.list.update((list) =>
      list.map((t) => (t.taskId === taskId ? { ...t, ...changes, taskId } : t)),
    );
  }

  remove(taskId: number): void {
    this.list.update((list) => list.filter((t) => t.taskId !== taskId));
  }

  /** Forgets everything, e.g. when the user logs out. */
  reset(): void {
    this.list.set([]);
    this.projectId.set(null);
    this.loading.set(false);
    this.loaded.set(false);
    this.error.set(null);
  }
}
