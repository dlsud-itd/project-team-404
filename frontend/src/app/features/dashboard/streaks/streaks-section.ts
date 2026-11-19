import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import type { Task } from '../../tasks/shared/types/task.types';
import { mapTaskError } from '../../tasks/task-crud/mappers/task-error.mapper';
import { TaskService } from '../../tasks/task-crud/services/task.service';
import { StreakBadge } from '../../tasks/task-streaks/components/streak-badge/streak-badge';
import {
  STREAKS_NOW,
  TaskStreaksService,
} from '../../tasks/task-streaks/services/task-streaks.service';
import type { TaskStreak } from '../../tasks/task-streaks/types/task-streak.types';
import { streakCount } from '../../tasks/task-streaks/utils/streak-label.util';
import {
  isStreakRecurrence,
  toTaskStreak,
} from '../../tasks/task-streaks/utils/streak-periods.util';
import { DashboardService, mapDashboardError } from '../shared/services/dashboard.service';
import type { DashboardStreak } from '../shared/types/dashboard.types';
import { matchStreakTasks } from './utils/match-streak-tasks.util';

type LoadState = 'loading' | 'ready' | 'error';

export interface StreakRow {
  title: string;
  streak: TaskStreak;
  /** The occurrence Complete marks done, or null when there is none or it isn't certain. */
  open: Task | null;
  /** Where the title links to; null when the task has no project page. */
  link: (string | number)[] | null;
}

const LOAD_ERROR = "We couldn't load your streaks. Please try again.";

const DONE_LABELS = { daily: 'Done today', weekly: 'Done this week', monthly: 'Done this month' };

/**
 * Running streaks on the dashboard, the ones at risk today first, each with a Complete button
 * for its open occurrence. Completions made here or anywhere else in the app reload the list.
 */
@Component({
  selector: 'app-dashboard-streaks',
  imports: [RouterLink, StreakBadge],
  templateUrl: './streaks-section.html',
  styleUrl: './streaks-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreaksSection implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly tasks = inject(TaskService);
  private readonly streaks = inject(TaskStreaksService);
  private readonly now = inject(STREAKS_NOW);
  private readonly destroyRef = inject(DestroyRef);
  /** Each load replaces the one before it, so a slow old answer never overwrites a newer one. */
  private readonly loads = new Subject<void>();

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly error = signal<string | null>(null);
  private readonly allRows = signal<StreakRow[]>([]);
  /** Running streaks only; at risk first, otherwise in the server's most-recent-first order. */
  protected readonly rows = computed(() => {
    const running = this.allRows().filter((row) => row.streak.currentStreak > 0);
    return [
      ...running.filter((row) => row.streak.atRisk),
      ...running.filter((row) => !row.streak.atRisk),
    ];
  });
  protected readonly atRiskCount = computed(
    () => this.rows().filter((row) => row.streak.atRisk).length,
  );
  protected readonly countLabel = computed(() => {
    const count = this.rows().length;
    const atRisk = this.atRiskCount();
    const streaks = `${count} active ${count === 1 ? 'streak' : 'streaks'}`;
    return atRisk ? `${streaks}, ${atRisk} at risk` : streaks;
  });

  /** Ids of open occurrences being completed. */
  protected readonly completing = signal<ReadonlySet<number>>(new Set());
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.loads
      .pipe(
        switchMap(() =>
          forkJoin({
            streaks: this.dashboard.streaks(),
            tasks: this.tasks.listAll({ recurring: true }),
          }).pipe(
            map(({ streaks, tasks }) => ({ rows: this.toRows(streaks, tasks), error: null })),
            catchError((error: unknown) => of({ rows: null, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ rows, error }) => {
        if (rows) {
          this.allRows.set(rows);
          this.error.set(null);
          this.loadState.set('ready');
          return;
        }
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? mapDashboardError(error).message
            : LOAD_ERROR,
        );
        // A failed background reload keeps the list that is already showing.
        if (this.loadState() !== 'ready') this.loadState.set('error');
      });
    this.tasks.completions.pipe(takeUntilDestroyed()).subscribe(() => this.loads.next());
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loadState.set('loading');
    this.error.set(null);
    this.loads.next();
  }

  protected doneLabel(row: StreakRow): string {
    return DONE_LABELS[row.streak.recurrence];
  }

  /** The badge shows the current streak, so the line under the title gives the best one. */
  protected longestText(row: StreakRow): string {
    return `Longest ${streakCount(row.streak.longestStreak, row.streak.recurrence)}`;
  }

  protected isCompleting(row: StreakRow): boolean {
    return row.open !== null && this.completing().has(row.open.taskId);
  }

  protected complete(row: StreakRow): void {
    const task = row.open;
    if (!task || this.completing().has(task.taskId)) return;
    this.setCompleting(task.taskId, true);
    this.actionError.set(null);
    this.notice.set(null);
    this.tasks
      .update(task.taskId, { completedAt: this.now().toISOString() })
      .pipe(
        finalize(() => this.setCompleting(task.taskId, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        // TaskService announces the completion, which reloads this list and the streak caches.
        next: () => this.notice.set(`“${row.title}” is done. Streak kept.`),
        error: (error: unknown) => this.actionError.set(mapTaskError(error).message),
      });
  }

  private toRows(streaks: DashboardStreak[], tasks: Task[]): StreakRow[] {
    const today = this.streaks.today();
    const rows: StreakRow[] = [];
    for (const item of streaks) {
      const { representative, open } = matchStreakTasks(item, tasks);
      const recurrence = representative?.recurrence;
      // Without the task the repeat is unknown, and with it whether the streak is still alive.
      if (!isStreakRecurrence(recurrence)) continue;
      const target = open ?? representative;
      rows.push({
        title: item.title,
        streak: toTaskStreak(item, recurrence, today),
        open,
        link:
          target && target.projectId > 0
            ? ['/projects', target.projectId, 'tasks', target.taskId, 'edit']
            : null,
      });
    }
    return rows;
  }

  private setCompleting(taskId: number, busy: boolean): void {
    this.completing.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }
}
