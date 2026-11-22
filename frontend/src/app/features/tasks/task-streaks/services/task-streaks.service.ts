import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, type Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SessionService } from '../../../auth/session/session.service';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { TaskService } from '../../task-crud/services/task.service';
import { instantToDate, userTimeZone } from '../../task-scheduling/utils/date-format.util';
import type { ApiTaskStreak, StreakRecurrence, TaskStreak } from '../types/task-streak.types';
import { isStreakRecurrence, toTaskStreak } from '../utils/streak-periods.util';

/** The current time, swappable in specs so "today" is fixed. */
export const STREAKS_NOW = new InjectionToken<() => Date>('STREAKS_NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

export type StreakLoadState = 'loading' | 'ready' | 'error';

interface StreakEntry {
  recurrence: StreakRecurrence;
  /** Tasks with the same key are most likely occurrences of one series; see seriesKey. */
  series: string;
  state: StreakLoadState;
  /** The last streak loaded; kept while a refresh is in flight so badges don't flicker. */
  api: ApiTaskStreak | null;
}

/**
 * The API never says which series a task belongs to. Occurrences of one series share their
 * project, repeat and title, so tasks matching on all three are treated as one series.
 */
export function seriesKey(task: Pick<Task, 'projectId' | 'recurrence' | 'title'>): string {
  return `${task.projectId}|${task.recurrence}|${task.title}`;
}

/**
 * Streaks of recurring tasks from GET /api/tasks/:taskId/streak, cached per task so every badge
 * and detail view of a task shares one request. A completion saved through TaskService anywhere
 * in the app reloads the streak of that task and of the other occurrences of its series, so
 * streaks update without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class TaskStreaksService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly tasksStore = inject(TasksStore);
  private readonly now = inject(STREAKS_NOW);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks`;

  private readonly entries = signal<ReadonlyMap<number, StreakEntry>>(new Map());
  private readonly requests = new Map<number, Subscription>();

  /** The user's timezone, which decides where each day starts. */
  readonly timeZone = computed(() => userTimeZone(this.session.currentUser()?.timezone));

  constructor() {
    // Streaks belong to whoever is signed in: forget them when that changes.
    // Effects run late, so only a real change of user resets; the first run just records who.
    let userId: string | null | undefined;
    effect(() => {
      const id = this.session.currentUser()?.id ?? null;
      untracked(() => {
        if (userId !== undefined && id !== userId) this.reset();
        userId = id;
      });
    });
    inject(TaskService)
      .completions.pipe(takeUntilDestroyed())
      .subscribe(({ taskId }) => this.refreshSeries(taskId));
  }

  /** Today, YYYY-MM-DD, in the user's timezone. */
  today(): string {
    return instantToDate(this.now().toISOString(), this.timeZone());
  }

  /** GET /api/tasks/:taskId/streak, without caching. */
  get(taskId: number): Observable<ApiTaskStreak> {
    return this.http.get<ApiTaskStreak>(`${this.baseUrl}/${taskId}/streak`);
  }

  /**
   * Makes sure a recurring task's streak is loaded. Safe to call from an effect: it requests a
   * task once, and again only after its repeat changed. Non-recurring tasks are ignored.
   */
  watch(task: Pick<Task, 'taskId' | 'projectId' | 'recurrence' | 'title'>): void {
    const { recurrence } = task;
    if (!isStreakRecurrence(recurrence)) return;
    const entry = untracked(() => this.entries().get(task.taskId));
    const series = seriesKey(task);
    if (entry?.recurrence === recurrence) {
      if (entry.series !== series) this.setEntry(task.taskId, { ...entry, series });
      return;
    }
    this.setEntry(task.taskId, { recurrence, series, state: 'loading', api: null });
    this.load(task.taskId);
  }

  /** Requests a watched task's streak again, e.g. from a Try again button. */
  refresh(taskId: number): void {
    const entry = untracked(() => this.entries().get(taskId));
    if (!entry) return;
    this.setEntry(taskId, { ...entry, state: 'loading' });
    this.load(taskId);
  }

  /** The task's streak as of today, or null until it has loaded. Reactive. */
  streak(taskId: number): TaskStreak | null {
    const entry = this.entries().get(taskId);
    if (!entry?.api) return null;
    return toTaskStreak(entry.api, entry.recurrence, this.todayFor(entry.api));
  }

  /** Where loading the task's streak stands, or null when it was never watched. Reactive. */
  loadState(taskId: number): StreakLoadState | null {
    return this.entries().get(taskId)?.state ?? null;
  }

  /** Forgets every streak, e.g. when the user logs out. */
  reset(): void {
    for (const request of this.requests.values()) request.unsubscribe();
    this.requests.clear();
    this.entries.set(new Map());
  }

  /** After a completion: the task itself and every watched occurrence of its series. */
  private refreshSeries(taskId: number): void {
    const entries = untracked(() => this.entries());
    const task = this.tasksStore.byId(taskId);
    const series = entries.get(taskId)?.series ?? (task ? seriesKey(task) : null);
    if (task && !entries.has(taskId)) this.watch(task);
    for (const [id, entry] of entries) {
      if (id === taskId || (series !== null && entry.series === series)) this.refresh(id);
    }
  }

  /** The server's day for this streak when it sent its timezone, so both sides agree on today. */
  private todayFor(api: ApiTaskStreak): string {
    const timeZone = api.timezone ? userTimeZone(api.timezone) : this.timeZone();
    return instantToDate(this.now().toISOString(), timeZone);
  }

  private load(taskId: number): void {
    // A newer request for the same task replaces the old one, so a slow answer can't win.
    this.requests.get(taskId)?.unsubscribe();
    const request = this.get(taskId).subscribe({
      next: (api) => this.updateEntry(taskId, { state: 'ready', api }),
      error: () => this.updateEntry(taskId, { state: 'error' }),
    });
    if (!request.closed) this.requests.set(taskId, request);
  }

  private updateEntry(taskId: number, changes: Partial<StreakEntry>): void {
    this.requests.delete(taskId);
    const entry = this.entries().get(taskId);
    if (entry) this.setEntry(taskId, { ...entry, ...changes });
  }

  private setEntry(taskId: number, entry: StreakEntry): void {
    this.entries.update((entries) => new Map(entries).set(taskId, entry));
  }
}
