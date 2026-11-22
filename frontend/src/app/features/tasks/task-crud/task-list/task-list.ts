import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, distinctUntilChanged, finalize, map, switchMap } from 'rxjs';
import { SessionService } from '../../../auth/session/session.service';
import { mapProjectError } from '../../../projects/project-crud/mappers/project-error.mapper';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { ConfirmDeleteTaskDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { TaskItem } from '../components/task-item/task-item';
import { mapTaskError } from '../mappers/task-error.mapper';
import { TaskService } from '../services/task.service';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import { TaskFilterBar } from '../../task-organization/components/filter-bar/filter-bar';
import { SortMenu, type SortChange } from '../../task-organization/components/sort-menu/sort-menu';
import { LabelService, type Label } from '../../task-organization/services/label.service';
import { TaskQueryStore } from '../../task-organization/state/task-query.store';
import type { TaskQuery } from '../../task-organization/types/task-query.types';
import {
  TASK_SORT_OPTIONS,
  rejectedTaskParams,
  sameTaskQuery,
  taskSortField,
  toTaskListFilter,
  withoutRejectedParams,
} from '../../task-organization/utils/task-query-params.util';
import {
  reorderBlockedReason,
  reorderTaskIds,
  withPositionOrder,
} from '../../task-organization/utils/reorder-tasks.util';
import { instantToDate, userTimeZone } from '../../task-scheduling/utils/date-format.util';
import { BoardView } from '../../task-views/board-view/board-view';
import { toBoardFilter } from '../../task-views/board-view/services/task-board.service';
import type { BoardFilter } from '../../task-views/board-view/types/task-board.types';
import { ViewSwitcher, type TaskView } from '../../task-views/view-switcher/view-switcher';

/** The tasks of one project, at /projects/:projectId/tasks. */
@Component({
  selector: 'app-task-list',
  imports: [
    RouterLink,
    TaskItem,
    ConfirmDeleteTaskDialog,
    TaskFilterBar,
    SortMenu,
    BoardView,
    ViewSwitcher,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  providers: [TaskQueryStore],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskList {
  protected readonly store = inject(TasksStore);
  private readonly tasks = inject(TaskService);
  private readonly projects = inject(ProjectService);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly labelsApi = inject(LabelService);
  protected readonly priorities = inject(PrioritiesStore);
  protected readonly labels = signal<Label[]>([]);
  protected readonly labelsError = signal<string | null>(null);
  protected readonly query = inject(TaskQueryStore);
  protected readonly sortOptions = TASK_SORT_OPTIONS;
  /** Each request replaces the one before it, so a slow old answer never overwrites a newer one. */
  private readonly reloads = new Subject<void>();

  protected readonly projectId = signal(0);
  /** List or board; the URL keeps it, so links and reloads open the same view. */
  protected readonly view = signal<TaskView>('list');
  /** The board's filters; a new object reloads the board. Null until the board first opens. */
  protected readonly boardFilter = signal<BoardFilter | null>(null);
  protected readonly project = computed(() => this.projectsStore.byId(this.projectId()) ?? null);
  /** The project does not exist or belongs to someone else. */
  protected readonly projectMissing = signal(false);

  /** True until the first list request for this project settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  /** A reorder is being saved; further moves wait for it. */
  protected readonly reordering = signal(false);
  /** Read out by screen readers after a move. */
  protected readonly announcement = signal('');
  /** Why the open tasks can't be reordered right now (filters, a sort, a long list), or null. */
  protected readonly reorderBlocked = computed(() =>
    reorderBlockedReason(this.query.query(), this.store.open().length),
  );
  protected readonly canReorder = computed(() => this.reorderBlocked() === null);

  protected readonly pendingDelete = signal<Task | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  /** Says which filter the server refused and was removed; cleared by the next change. */
  protected readonly filterError = signal<string | null>(null);

  constructor() {
    // Read first, so the project's first load below already knows which view to fill.
    this.route.queryParamMap
      .pipe(
        map((params): TaskView => (params.get('view') === 'board' ? 'board' : 'list')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((view) => {
        const changed = view !== this.view();
        this.view.set(view);
        if (changed && this.projectId() && !this.projectMissing()) this.load();
      });
    // The new-task popup adds to the list's store; the board has its own copy, so reload it.
    let wasCreating = false;
    effect(() => {
      const creating = this.store.creating() !== null;
      if (wasCreating && !creating) untracked(() => this.view() === 'board' && this.load());
      wasCreating = creating;
    });
    this.reloads
      .pipe(
        switchMap(() =>
          this.tasks
            .refresh(
              this.projectId(),
              withPositionOrder(toTaskListFilter(this.query.query(), this.today())),
            )
            // The store records the error for the template.
            .pipe(
              catchError((error: unknown) => {
                this.dropRejectedFilters(error);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
    // The router reuses this page between projects, so :projectId can change under it.
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.open(Number(params.get('projectId'))));
    this.query.changes$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.projectMissing()) this.load();
    });
    this.labelsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => this.labels.set(labels),
        error: () => this.labelsError.set('Could not load labels. Please try again.'),
      });
  }

  private open(projectId: number): void {
    this.projectId.set(projectId);
    this.notice.set(null);
    this.actionError.set(null);
    this.projectMissing.set(!Number.isInteger(projectId) || projectId <= 0);
    if (this.projectMissing()) return;
    this.loadProject();
    this.load();
  }

  protected load(): void {
    if (this.view() === 'board') {
      this.boardFilter.set(toBoardFilter(toTaskListFilter(this.query.query(), this.today())));
    } else {
      this.reloads.next();
    }
  }

  protected changeQuery(changes: Partial<TaskQuery>): void {
    this.filterError.set(null);
    this.query.set(changes);
  }

  protected clearFilters(): void {
    this.filterError.set(null);
    this.query.clear();
  }

  protected setSort({ value, direction }: SortChange): void {
    this.changeQuery({ orderBy: taskSortField(value), orderDirection: direction });
  }

  /**
   * A 400 names the parameters the server refused, e.g. a priority level it does not know.
   * Retrying would fail the same way, so those filters are removed and the list reloads.
   * Other errors stay in the store, where the page offers a retry.
   */
  protected dropRejectedFilters(error: unknown): void {
    const params = rejectedTaskParams(error);
    if (!params) return;
    const current = this.query.query();
    const { query, message } = withoutRejectedParams(current, params);
    if (sameTaskQuery(query, current)) return;
    this.store.error.set(null);
    this.filterError.set(message);
    this.query.set(query);
  }

  /** Today in the user's timezone, the day the server compares due dates against. */
  private today(): string {
    return instantToDate(
      new Date().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    );
  }

  protected dropped(event: CdkDragDrop<unknown>): void {
    this.moveTask(event.previousIndex, event.currentIndex);
  }

  /**
   * Moves an open task and saves the whole new order. The list changes at once; a failure puts
   * it back with a message, and a 409 (the list changed elsewhere) reloads it. A keyboard move
   * keeps focus on the same button of the moved task.
   */
  protected moveTask(from: number, to: number, button?: 'up' | 'down'): void {
    const open = this.store.open();
    const taskIds = reorderTaskIds(open, from, to);
    if (!taskIds || !this.canReorder() || this.reordering()) return;

    const task = open[from];
    const position = taskIds.indexOf(task.taskId) + 1;
    this.notice.set(null);
    this.actionError.set(null);
    this.reordering.set(true);
    this.announcement.set(`Moved ${task.title} to position ${position} of ${taskIds.length}.`);
    if (button) this.refocus(task.taskId, button);

    this.tasks
      .reorder(this.projectId(), taskIds)
      .pipe(
        finalize(() => this.reordering.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.actionError.set(
              "Your new order wasn't saved because this list changed somewhere else. It has been reloaded.",
            );
            this.load();
          } else {
            this.actionError.set(`Your new order wasn't saved. ${mapTaskError(error).message}`);
          }
          this.announcement.set("Your new order wasn't saved.");
        },
      });
  }

  /** After the moved row renders in its new place, focus its button again (or the other one at an end). */
  private refocus(taskId: number, button: 'up' | 'down'): void {
    afterNextRender(
      () => {
        const find = (which: string) =>
          this.host.nativeElement.querySelector<HTMLButtonElement>(`#task-${taskId}-${which}`);
        const same = find(button);
        const target = same && !same.disabled ? same : find(button === 'up' ? 'down' : 'up');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected newTask(): void {
    this.notice.set(null);
    this.store.creating.set({ projectId: this.projectId() });
  }

  protected askDelete(task: Task): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.deleteError.set(null);
    this.pendingDelete.set(task);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.tasks
      .delete(task.taskId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.notice.set(`“${task.title}” was deleted.`);
        },
        error: (error: unknown) => {
          const { message, notFound } = mapTaskError(error);
          if (notFound) {
            // Already gone (e.g. deleted in another tab): close and show the real list.
            this.pendingDelete.set(null);
            this.actionError.set(message);
            this.load();
            return;
          }
          this.deleteError.set(message);
        },
      });
  }

  /** Fetches the project for its name; a missing project replaces the page with a message. */
  private loadProject(): void {
    this.projects
      .get(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => {
          if (mapProjectError(error).notFound) this.projectMissing.set(true);
        },
      });
  }
}
