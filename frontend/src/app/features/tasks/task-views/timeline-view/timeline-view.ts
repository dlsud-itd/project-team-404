import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { ArchiveUndoService } from '../../../archive/services/archive-undo.service';
import { SessionService } from '../../../auth/session/session.service';
import { TasksStore } from '../../shared/state/tasks.store';
import { NewTaskDialog } from '../../task-crud/components/new-task-dialog/new-task-dialog';
import { mapTaskError, notDueAvailableOn } from '../../task-crud/mappers/task-error.mapper';
import { TaskService } from '../../task-crud/services/task.service';
import { instantToDate, userTimeZone } from '../../task-scheduling/utils/date-format.util';
import { ResizeHandle, type ResizeStep } from './components/resize-handle/resize-handle';
import { TimelineBar } from './components/timeline-bar/timeline-bar';
import { TimelineHeader, type TimelineStep } from './components/timeline-header/timeline-header';
import { TaskTimelineService } from './services/task-timeline.service';
import type {
  ApiTimeline,
  ApiTimelineBar,
  ApiTimelineGroup,
  TimelineFilter,
  TimelineZoom,
} from './types/task-timeline.types';
import {
  DAY_WIDTH_LIMITS,
  RESIZE_STEP,
  clampWidth,
  dayWidthForDrag,
  readTimelineLayout,
  saveTimelineLayout,
} from './utils/timeline-layout.util';
import {
  MIN_DAY_WIDTH,
  dateToX,
  dayCount,
  daysIn,
  inWindow,
  shiftWindow,
  windowFor,
  xToDate,
} from './utils/timeline-scale.util';

export const TIMELINE_PROJECT_GONE = 'This project is no longer available.';

/**
 * Dated tasks as a Gantt-style timeline: one bar per task from its scheduled (or due) date to its
 * deadline (or due date), grouped by project, a week or a month at a time.
 *
 * - Click a bar to edit its task; right-click it to Edit or Archive.
 * - Its round checkbox marks the task done or not done.
 * - Click an empty day to add a task that starts on that day.
 */
@Component({
  selector: 'app-timeline-view',
  imports: [NewTaskDialog, RouterLink, ResizeHandle, TimelineBar, TimelineHeader],
  templateUrl: './timeline-view.html',
  styleUrl: './timeline-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineView {
  /** One project's tasks, or null for every project. */
  readonly projectId = input<number | null>(null);
  /** The Sprint 5 filters; a new object reloads the timeline, even when its values are unchanged. */
  readonly filter = input.required<TimelineFilter>();
  readonly filtersActive = input(false);
  /** The query parameter that holds the page's view, for the link to the List view. */
  readonly viewParam = input('view');

  /** A load failed; the page may drop filters the server refused. */
  readonly loadFailed = output<unknown>();
  readonly clearFilters = output<void>();

  private readonly api = inject(TaskTimelineService);
  private readonly tasks = inject(TaskService);
  private readonly tasksStore = inject(TasksStore);
  private readonly archiveUndo = inject(ArchiveUndoService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly today = signal(this.todayInUserZone());
  protected readonly zoom = signal<TimelineZoom>('week');
  /** A day inside the window on screen. */
  private readonly anchor = signal(this.today());
  protected readonly window = computed(() => windowFor(this.zoom(), this.anchor()));
  protected readonly includeCompleted = signal(false);

  protected readonly data = signal<ApiTimeline | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The task open in the edit popup. */
  protected readonly editingTaskId = signal<number | null>(null);
  /** Tasks whose done state is saving. */
  protected readonly busyIds = signal<ReadonlySet<number>>(new Set());
  /** Read out by screen readers after a change. */
  protected readonly announcement = signal('');

  protected readonly days = computed(() => daysIn(this.window()));
  protected readonly minTrackWidth = computed(
    () => dayCount(this.window()) * MIN_DAY_WIDTH[this.zoom()],
  );
  /** One day as a share of the grid, in percent. */
  protected readonly dayShare = computed(() => 100 / dayCount(this.window()));
  protected readonly showsToday = computed(() => inWindow(this.today(), this.window()));
  /** The today line sits in the middle of today's column. */
  protected readonly todayX = computed(() =>
    this.showsToday() ? dateToX(this.today(), this.window()) + this.dayShare() / 2 : null,
  );
  protected readonly weekends = computed(() =>
    this.days()
      .filter((day) => day.isWeekend)
      .map((day) => dateToX(day.date, this.window())),
  );
  /** Names List outright, so it wins over a view the page remembered for the project. */
  protected readonly listLinkParams = computed(() => ({ [this.viewParam()]: 'list' }));

  /*
   * The day width the viewer has dragged to, per zoom, remembered in this browser. Null is the
   * default: days that stretch to fit the screen.
   */
  private readonly dayWidths = signal(readTimelineLayout().dayWidth);
  protected readonly dayWidth = computed(() => this.dayWidths()[this.zoom()]);
  /** The day grid's fixed width, or null while the days fit the screen. */
  protected readonly trackWidth = computed(() => {
    const width = this.dayWidth();
    return width === null ? null : width * dayCount(this.window());
  });
  protected readonly dayLimits = computed(() => DAY_WIDTH_LIMITS[this.zoom()]);
  /** True while a handle is being dragged. */
  protected readonly resizing = signal(false);

  private readonly dayStrip = viewChild<ElementRef<HTMLElement>>('dayStrip');
  /** The width a drag started from, so each move is measured against it. */
  private dragStart = 0;

  /**
   * Each load replaces the one before it, so a slow old answer never overwrites a newer one.
   * A silent load (after a change to a task) keeps the bars as they are until it answers.
   */
  private readonly loads = new Subject<{ silent: boolean }>();
  private shownProjectId: number | null | undefined = undefined;

  constructor() {
    this.loads
      .pipe(
        switchMap(({ silent }) => {
          if (!silent) this.loading.set(true);
          return this.api
            .get(this.window(), {
              projectId: this.projectId(),
              includeCompleted: this.includeCompleted(),
              filter: this.filter(),
            })
            .pipe(
              tap(() => this.error.set(null)),
              catchError((error: unknown) => {
                this.error.set(this.errorMessage(error));
                this.loadFailed.emit(error);
                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => this.data.set(data));

    effect(() => {
      const projectId = this.projectId();
      this.filter();
      this.window();
      this.includeCompleted();
      untracked(() => {
        // Another project's bars would mislead while the new ones load.
        if (projectId !== this.shownProjectId) {
          this.shownProjectId = projectId;
          this.data.set(null);
        }
        this.reload();
      });
    });
  }

  protected reload(silent = false): void {
    this.loads.next({ silent });
  }

  protected step(step: TimelineStep): void {
    if (step === 'today') {
      const today = this.todayInUserZone();
      this.today.set(today);
      this.anchor.set(today);
      return;
    }
    this.anchor.set(shiftWindow(this.zoom(), this.window(), step === 'next' ? 1 : -1).from);
  }

  /** Keeps today in view when it is on screen; otherwise opens on the window's first day. */
  protected setZoom(zoom: TimelineZoom): void {
    this.anchor.set(this.showsToday() ? this.today() : this.window().from);
    this.zoom.set(zoom);
  }

  /* ----- Working on tasks ----- */

  protected edit(bar: ApiTimelineBar): void {
    this.editingTaskId.set(bar.id);
  }

  protected edited(): void {
    this.reload(true);
  }

  /**
   * A click on an empty part of a row opens the new-task popup, starting on the day under the
   * pointer, in the row's project. Clicks on a bar are the bar's own.
   */
  protected addAt(event: MouseEvent, group: ApiTimelineGroup): void {
    if ((event.target as HTMLElement).closest('app-timeline-bar')) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width) return;
    const day = xToDate(((event.clientX - rect.left) / rect.width) * 100, this.window());
    this.tasksStore.creating.set({
      // A group without a project is the Inbox, which the popup takes as null.
      projectId: group.projectId ?? this.projectId(),
      scheduledDate: day,
    });
  }

  /** Ticks or unticks a task at once; a failure puts it back. */
  protected toggleDone(bar: ApiTimelineBar): void {
    if (this.busyIds().has(bar.id)) return;
    const done = !bar.isDone;
    const completedAt = done ? new Date().toISOString() : null;
    this.updateBar(bar.id, { isDone: done, isOverdue: done ? false : bar.isOverdue });
    this.setBusy(bar.id, true);

    this.tasks
      .update(bar.id, { completedAt })
      .pipe(
        finalize(() => this.setBusy(bar.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          // TaskService.update tells the rest of the app (dashboard, streaks) about the change.
          this.announcement.set(`“${bar.title}” marked ${done ? 'done' : 'not done'}.`);
          // Completed tasks may be hidden, and a repeating task makes its next occurrence.
          this.reload(true);
        },
        error: (error: unknown) => {
          this.updateBar(bar.id, { isDone: bar.isDone, isOverdue: bar.isOverdue });
          this.announcement.set(`“${bar.title}” was not changed.`);
          if (notDueAvailableOn(error)) this.toast.info(mapTaskError(error).message);
          else this.toast.error(`Couldn't update “${bar.title}”. Please try again.`);
        },
      });
  }

  /** Takes the bar off at once; a failure or Undo puts it back. */
  protected archive(bar: ApiTimelineBar): void {
    const before = this.data();
    if (!before) return;
    const after: ApiTimeline = {
      ...before,
      projects: before.projects
        .map((group) => ({ ...group, bars: group.bars.filter((item) => item.id !== bar.id) }))
        .filter((group) => group.bars.length > 0),
    };

    this.archiveUndo.archive(
      { kind: 'task', id: bar.id, name: bar.title },
      {
        apply: () => {
          this.data.set(after);
          this.announcement.set(`“${bar.title}” was archived.`);
        },
        rollback: () => {
          // Only put the bar back if nothing has replaced the timeline since, e.g. a reload.
          if (this.data() === after) this.data.set(before);
          else this.reload(true);
        },
      },
    );
  }

  private updateBar(id: number, changes: Partial<ApiTimelineBar>): void {
    this.data.update(
      (data) =>
        data && {
          ...data,
          projects: data.projects.map((group) => ({
            ...group,
            bars: group.bars.map((item) => (item.id === id ? { ...item, ...changes } : item)),
          })),
        },
    );
  }

  private setBusy(id: number, busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /* ----- Resizing the day columns ----- */

  protected startDayResize(): void {
    this.resizing.set(true);
    this.dragStart = this.currentDayWidth();
  }

  /** `index` is the day whose right edge is being dragged. */
  protected resizeDays(dx: number, index: number): void {
    this.setDayWidth(dayWidthForDrag(this.dragStart, dx, index, this.dayLimits()));
  }

  protected stepDays(step: ResizeStep): void {
    const limits = this.dayLimits();
    const width =
      step === 'min'
        ? limits.min
        : step === 'max'
          ? limits.max
          : clampWidth(this.currentDayWidth() + step * RESIZE_STEP[this.zoom()], limits);
    this.setDayWidth(width);
    this.saveLayout();
  }

  protected resetDays(): void {
    this.setDayWidth(null);
    this.saveLayout();
  }

  /** A drag only saves once it ends, not on every move. */
  protected endResize(): void {
    this.resizing.set(false);
    this.saveLayout();
  }

  private setDayWidth(width: number | null): void {
    const zoom = this.zoom();
    this.dayWidths.update((widths) => ({ ...widths, [zoom]: width }));
  }

  /** One day as drawn; while days fit the screen, that is the grid's width shared out. */
  private currentDayWidth(): number {
    const strip = this.dayStrip()?.nativeElement.getBoundingClientRect().width ?? 0;
    const width = this.dayWidth() ?? strip / dayCount(this.window());
    return clampWidth(width, this.dayLimits());
  }

  private saveLayout(): void {
    saveTimelineLayout({ dayWidth: this.dayWidths() });
  }

  /* ----- Helpers ----- */

  protected groupName(group: ApiTimelineGroup): string {
    return group.projectName ?? 'Inbox';
  }

  protected groupKey(group: ApiTimelineGroup): string {
    return group.projectId === null ? 'inbox' : String(group.projectId);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) return TIMELINE_PROJECT_GONE;
    return mapTaskError(error).message;
  }

  /** Today in the user's timezone, the day the server marks overdue tasks against. */
  private todayInUserZone(): string {
    return instantToDate(
      new Date().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    );
  }
}
