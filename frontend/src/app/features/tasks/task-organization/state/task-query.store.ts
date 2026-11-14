import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, convertToParamMap } from '@angular/router';
import { Observable, Subject, debounceTime, filter, identity, tap } from 'rxjs';
import { DEFAULT_TASK_QUERY, type TaskQuery } from '../types/task-query.types';
import {
  activeFilterCount,
  sameTaskQuery,
  taskQueryFromParams,
  taskQueryToParams,
  updateTaskQuery,
} from '../utils/task-query-params.util';

/** How long the list waits after the last filter change before asking the server again. */
export const TASK_QUERY_DEBOUNCE_MS = new InjectionToken<number>('TASK_QUERY_DEBOUNCE_MS', {
  factory: () => 250,
});

/**
 * The task list's filters and sort. The URL is the source of truth, so links, reloads and
 * Back keep them; this store mirrors it as a signal. Provide it on the page component, so it
 * reads that page's route and starts fresh on every visit.
 */
@Injectable()
export class TaskQueryStore {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debounceMs = inject(TASK_QUERY_DEBOUNCE_MS);

  private readonly state = signal<TaskQuery>(
    taskQueryFromParams(this.route.snapshot.queryParamMap),
  );
  readonly query = this.state.asReadonly();
  readonly count = computed(() => activeFilterCount(this.state()));

  private readonly changed = new Subject<TaskQuery>();
  /** The query the last emitted reload was for, starting with the one the page opened with. */
  private lastEmitted = this.state();

  /**
   * Emits once the query has settled after changes, so quick clicks cost one request. Each
   * emission differs from the previous one.
   */
  readonly changes$: Observable<TaskQuery> = this.changed.pipe(
    this.debounceMs > 0 ? debounceTime(this.debounceMs) : identity,
    filter((query) => !sameTaskQuery(query, this.lastEmitted)),
    tap((query) => (this.lastEmitted = query)),
  );

  constructor() {
    // Back, Forward or a link to the same page with other params.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const params = convertToParamMap(this.router.parseUrl(this.router.url).queryParams);
        const next = taskQueryFromParams(params);
        if (!sameTaskQuery(next, this.state())) this.apply(next, false);
      });
  }

  set(changes: Partial<TaskQuery>): void {
    this.apply(updateTaskQuery(this.state(), changes), true);
  }

  /** Removes every filter but keeps the sort. */
  clear(): void {
    const { orderBy, orderDirection } = this.state();
    this.apply({ ...DEFAULT_TASK_QUERY, orderBy, orderDirection }, true);
  }

  private apply(query: TaskQuery, writeUrl: boolean): void {
    this.state.set(query);
    if (writeUrl) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: taskQueryToParams(query),
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.changed.next(query);
  }
}
