import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ArchiveAction } from '../../archive/components/archive-action/archive-action';
import type { ArchiveHooks } from '../../archive/services/archive-undo.service';
import { TaskQueryStore } from '../../tasks/task-organization/state/task-query.store';
import {
  TASK_SORT_OPTIONS,
  taskSortField,
  toTaskListFilter,
} from '../../tasks/task-organization/utils/task-query-params.util';
import { instantToDate, userTimeZone } from '../../tasks/task-scheduling/utils/date-format.util';
import {
  availableOnLabel,
  occurrenceAvailableOn,
} from '../../tasks/shared/utils/occurrence-due.util';
import { StreakBadge } from '../../tasks/task-streaks/components/streak-badge/streak-badge';
import { BoardView } from '../../tasks/task-views/board-view/board-view';
import { toBoardFilter } from '../../tasks/task-views/board-view/services/task-board.service';
import type { BoardFilter } from '../../tasks/task-views/board-view/types/task-board.types';
import { TimelineView } from '../../tasks/task-views/timeline-view/timeline-view';
import {
  ViewSwitcher,
  toTaskView,
  type TaskView,
} from '../../tasks/task-views/view-switcher/view-switcher';

/**
 * The query parameters for the Tasks tab's view and board project. Home already uses `view`
 * for the Projects tab, so these have their own names.
 */
export const TASK_VIEW_PARAM = 'taskView';
export const BOARD_PROJECT_PARAM = 'boardProject';

@Component({
  selector: 'app-tasks-page',
  imports: [
    ConfirmDeleteTaskDialog,
    NewTaskDialog,
    TaskFilterBar,
    SortMenu,
    StreakBadge,
    BoardView,
    TimelineView,
    ViewSwitcher,
    ArchiveAction,
  ],
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

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly viewParam = TASK_VIEW_PARAM;
  /** List of every task, one project's board, or every project's timeline; the URL keeps it. */
  protected readonly view = signal<TaskView>('list');
  /** The project named in the URL, if any. */
  private readonly requestedProject = signal<number | null>(null);
  /**
   * The board's project: the one in the URL if it still exists, otherwise the first project
   * that is not the Inbox, otherwise the Inbox.
   */
  protected readonly boardProjectId = computed(() => {
    const projects = this.projectsStore.active();
    const requested = this.requestedProject();
    if (requested !== null && projects.some((p) => p.projectId === requested)) return requested;
    return (projects.find((p) => !p.isInbox) ?? projects[0])?.projectId ?? null;
  });
  /** The board's or timeline's filters; a new object reloads it. */
  protected readonly boardFilter = signal<BoardFilter>({});

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view: TaskView = toTaskView(params.get(TASK_VIEW_PARAM));
      const project = Number(params.get(BOARD_PROJECT_PARAM));
      this.requestedProject.set(Number.isInteger(project) && project > 0 ? project : null);
      if (view === this.view()) return;
      this.view.set(view);
      this.reloadView();
    });
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
    this.query.changes$.pipe(takeUntilDestroyed()).subscribe(() => this.reloadView());
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

  /** Reloads whichever view is on screen with the current filters. */
  private reloadView(): void {
    if (this.view() !== 'list') this.boardFilter.set(toBoardFilter(this.filter()));
    else this.reloads.next();
  }

  protected selectBoardProject(event: Event): void {
    const projectId = Number((event.target as HTMLSelectElement).value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [BOARD_PROJECT_PARAM]: projectId },
      queryParamsHandling: 'merge',
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

  /** "Available on Nov 22" for a repeat that isn't due yet, otherwise null. */
  protected notDueLabel(task: Task): string | null {
    const today = instantToDate(
      new Date().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    );
    const day = occurrenceAvailableOn(
      {
        isRecurring: task.isRecurring,
        done: task.completedAt !== null,
        occurrence: task.dueDate ?? task.scheduledDate,
      },
      today,
    );
    return day ? availableOnLabel(day) : null;
  }

  protected toggleCompleted(task: Task): void {
    if (this.isBusy(task) || this.notDueLabel(task)) return;
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

  /** New tasks go to the Inbox, or to the board's project while the board is shown. */
  protected openNewTaskDialog(): void {
    const projectId =
      this.view() === 'board'
        ? this.boardProjectId()
        : (this.projectsStore.inbox()?.projectId ?? null);
    this.tasksStore.creating.set({ projectId });
  }

  protected addCreatedTask(task: Task): void {
    if (this.view() !== 'list') this.reloadView();
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

  /** Archive takes the row out at once and puts it back on failure or Undo. */
  protected readonly archiveHooks = (taskId: number): ArchiveHooks => {
    const task = this.taskList().find((item) => item.taskId === taskId);
    return {
      apply: () => this.taskList.update((tasks) => tasks.filter((item) => item.taskId !== taskId)),
      rollback: () => {
        if (!task) return;
        this.taskList.update((tasks) =>
          tasks.some((item) => item.taskId === taskId) ? tasks : [...tasks, task],
        );
      },
    };
  };

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
