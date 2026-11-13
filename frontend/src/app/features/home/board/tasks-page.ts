import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { mapProjectError } from '../../projects/project-crud/mappers/project-error.mapper';
import { ProjectService } from '../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import { ConfirmDeleteTaskDialog } from '../../tasks/task-crud/components/confirm-delete-dialog/confirm-delete-dialog';
import { mapTaskError } from '../../tasks/task-crud/mappers/task-error.mapper';
import { TaskService } from '../../tasks/task-crud/services/task.service';
import { NewTaskDialog } from '../../tasks/task-crud/components/new-task-dialog/new-task-dialog';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import { PrioritiesStore } from '../../settings/state/priorities.store';
import type { Task } from '../../tasks/shared/types/task.types';

@Component({
  selector: 'app-tasks-page',
  imports: [ConfirmDeleteTaskDialog, NewTaskDialog],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  protected readonly projectsStore = inject(ProjectsStore);
  protected readonly priorities = inject(PrioritiesStore);

  private readonly projects = inject(ProjectService);
  private readonly tasksApi = inject(TaskService);
  protected readonly tasksStore = inject(TasksStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly taskList = signal<Task[]>([]);
  protected readonly tasks = computed(() =>
    [...this.taskList()].sort(
      (left, right) =>
        Number(left.completedAt !== null) - Number(right.completedAt !== null) ||
        (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31') ||
        left.taskId - right.taskId,
    ),
  );
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyTasks = signal<ReadonlySet<number>>(new Set());
  protected readonly pendingDelete = signal<Task | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      projects: this.projects.refresh(),
      tasks: this.tasksApi.listAll(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ tasks }) => {
          this.taskList.set(tasks);
        },
        error: (error: unknown) => {
          const taskError = mapTaskError(error);
          const projectError = mapProjectError(error);
          this.loadError.set(
            taskError.message !== 'Something went wrong. Please try again.'
              ? taskError.message
              : projectError.message,
          );
        },
      });
  }

  protected projectName(projectId: number): string {
    return this.projectsStore.byId(projectId)?.name ?? 'Inbox';
  }

  protected projectColor(projectId: number): string | null {
    return this.projectsStore.byId(projectId)?.color ?? null;
  }

  protected priorityName(priorityId: number): string {
    return this.priorities.nameOf(priorityId);
  }

  protected isBusy(task: Task): boolean {
    return this.busyTasks().has(task.taskId);
  }

  protected toggleCompleted(task: Task): void {
    if (this.isBusy(task)) return;
    const completedAt = task.completedAt === null ? new Date().toISOString() : null;
    this.setBusy(task.taskId, true);
    this.actionError.set(null);
    this.tasksApi
      .update(task.taskId, { completedAt })
      .pipe(
        finalize(() => this.setBusy(task.taskId, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () =>
          this.taskList.update((tasks) =>
            tasks.map((item) => (item.taskId === task.taskId ? { ...item, completedAt } : item)),
          ),
        error: (error: unknown) => this.actionError.set(mapTaskError(error).message),
      });
  }

  protected openNewTaskDialog(): void {
    this.tasksStore.creating.set({
      projectId: this.projectsStore.inbox()?.projectId ?? null,
    });
  }

  protected addCreatedTask(task: Task): void {
    this.taskList.update((tasks) =>
      tasks.some((item) => item.taskId === task.taskId) ? tasks : [...tasks, task],
    );
  }

  protected askDelete(task: Task): void {
    this.deleteError.set(null);
    this.pendingDelete.set(task);
  }

  protected cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.tasksApi
      .delete(task.taskId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.taskList.update((tasks) => tasks.filter((item) => item.taskId !== task.taskId));
          this.pendingDelete.set(null);
        },
        error: (error: unknown) => this.deleteError.set(mapTaskError(error).message),
      });
  }

  protected formatDueDate(dueDate: string | null): string {
    if (!dueDate) return 'No due date';
    const [year, month, day] = dueDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(year === new Date().getFullYear() ? {} : { year: 'numeric' }),
    });
  }

  protected isOverdue(task: Task): boolean {
    if (task.completedAt || !task.dueDate) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return task.dueDate < today;
  }

  private setBusy(taskId: number, busy: boolean): void {
    this.busyTasks.update((tasks) => {
      const next = new Set(tasks);
      if (busy) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }
}
