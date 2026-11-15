import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, forkJoin, switchMap } from 'rxjs';
import { SessionService } from '../../auth/session/session.service';
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
import { TaskFilterBar } from '../../tasks/task-organization/components/filter-bar/filter-bar';
import {
  SortMenu,
  type SortChange,
} from '../../tasks/task-organization/components/sort-menu/sort-menu';
import { LabelService, type Label } from '../../tasks/task-organization/services/label.service';
import { TaskQueryStore } from '../../tasks/task-organization/state/task-query.store';
import {
  TASK_SORT_OPTIONS,
  taskSortField,
  toTaskListFilter,
} from '../../tasks/task-organization/utils/task-query-params.util';
import { instantToDate, userTimeZone } from '../../tasks/task-scheduling/utils/date-format.util';

@Component({
  selector: 'app-tasks-page',
  imports: [ConfirmDeleteTaskDialog, NewTaskDialog, TaskFilterBar, SortMenu],
  providers: [TaskQueryStore],
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
  private readonly session = inject(SessionService);
  private readonly labelsApi = inject(LabelService);
  /** Filters and sort, kept in the URL next to ?tab=tasks. */
  protected readonly query = inject(TaskQueryStore);
  protected readonly sortOptions = TASK_SORT_OPTIONS;
  protected readonly labels = signal<Label[]>([]);
  protected readonly labelsError = signal<string | null>(null);

  private readonly taskList = signal<Task[]>([]);
  /** The server's order when a sort is picked; otherwise open first, then by due date. */
  protected readonly tasks = computed(() =>
    this.query.query().orderBy
      ? this.taskList()
      : [...this.taskList()].sort(
          (left, right) =>
            Number(left.completedAt !== null) - Number(right.completedAt !== null) ||
            (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31') ||
            left.taskId - right.taskId,
        ),
  );
  protected readonly loading = signal(true);
  /** A filter change is reloading the list; the current tasks stay on screen meanwhile. */
  protected readonly refreshing = signal(false);
  /** Each filter reload replaces the one before it, so a slow old answer never wins. */
  private readonly reloads = new Subject<void>();
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyTasks = signal<ReadonlySet<number>>(new Set());
  protected readonly pendingDelete = signal<Task | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    this.reloads
      .pipe(
        switchMap(() => {
          this.refreshing.set(true);
          this.loadError.set(null);
          return this.tasksApi.listAll(this.filter()).pipe(
            finalize(() => this.refreshing.set(false)),
            catchError((error: unknown) => {
              this.loadError.set(mapTaskError(error).message);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((tasks) => this.taskList.set(tasks));
    this.query.changes$.pipe(takeUntilDestroyed()).subscribe(() => this.reloads.next());
    this.labelsApi
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (labels) => this.labels.set(labels),
        error: () => this.labelsError.set('Could not load labels. Please try again.'),
      });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      projects: this.projects.refresh(),
      tasks: this.tasksApi.listAll(this.filter()),
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

  protected setSort({ value, direction }: SortChange): void {
    this.query.set({ orderBy: taskSortField(value), orderDirection: direction });
  }

  /** The API filter for the current query, with "today" in the user's timezone. */
  private filter() {
    const today = instantToDate(
      new Date().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    );
    return toTaskListFilter(this.query.query(), today);
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
