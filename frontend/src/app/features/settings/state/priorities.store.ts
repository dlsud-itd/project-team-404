import {
  Injectable,
  computed,
  effect,
  inject,
  provideEnvironmentInitializer,
  signal,
  untracked,
} from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { SessionService } from '../../auth/session/session.service';
import { PRIORITY_NAMES, type ApiTaskPriority } from '../../tasks/shared/types/task.types';
import { PrioritiesService } from '../services/priorities.service';
import {
  NO_COLOR,
  type DeletePriorityResult,
  type NameAndColor,
  type PriorityLevel,
} from '../types/settings.types';

/**
 * The fixed levels of the Sprint 3 API, under the ids tbl_priority_level gives them. The store
 * shows these until /api/priorities answers, and keeps them when the server has no such route.
 */
export const BUILT_IN_PRIORITIES: readonly PriorityLevel[] = [
  { id: 1, name: 'High', color: '#D84A4A', sortOrder: 0, isDefault: false, taskCount: null },
  { id: 2, name: 'Medium', color: '#D59B38', sortOrder: 1, isDefault: true, taskCount: null },
  { id: 3, name: 'Low', color: '#6E9F79', sortOrder: 2, isDefault: false, taskCount: null },
];

export const REORDER_FAILED_MESSAGE = "Couldn't save the new priority order. It has been put back.";

/**
 * The signed-in user's priority levels, shared by the task form, task filters, home page and
 * settings. Everything reads levels from here, so they all show the same names, order and colors.
 */
@Injectable({ providedIn: 'root' })
export class PrioritiesStore {
  private readonly api = inject(PrioritiesService);
  private readonly toast = inject(ToastService);

  private readonly list = signal<readonly PriorityLevel[]>(BUILT_IN_PRIORITIES);
  /** 'server' once /api/priorities has answered; until then the built-in levels are shown. */
  readonly source = signal<'built-in' | 'server'>('built-in');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** The levels in the user's order. */
  readonly levels = computed(() =>
    [...this.list()].sort((left, right) => left.sortOrder - right.sortOrder),
  );
  readonly defaultLevel = computed(
    () =>
      this.levels().find((level) => level.isDefault) ?? this.levels()[0] ?? BUILT_IN_PRIORITIES[1],
  );
  /** Whether the levels can be changed: only the server's own levels can. */
  readonly editable = computed(() => this.source() === 'server');

  /** Fetches the user's levels. On failure the current levels stay and `error` says why. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (levels) => {
        this.list.set(levels);
        this.source.set('server');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Couldn't load your priority levels.");
      },
    });
  }

  /** Back to the built-in levels, for when the user signs out. */
  reset(): void {
    this.list.set(BUILT_IN_PRIORITIES);
    this.source.set('built-in');
    this.loading.set(false);
    this.error.set(null);
  }

  byId(id: number): PriorityLevel | undefined {
    return this.list().find((level) => level.id === id);
  }

  nameOf(id: number): string {
    return this.byId(id)?.name ?? 'No priority';
  }

  colorOf(id: number): string {
    return this.byId(id)?.color ?? NO_COLOR;
  }

  /**
   * The Sprint 3 name to send for a level while the built-in levels are in use, or undefined once
   * the server's own levels are loaded (send priorityId then).
   */
  legacyName(id: number): ApiTaskPriority | undefined {
    return this.source() === 'built-in' ? PRIORITY_NAMES[id] : undefined;
  }

  create(input: NameAndColor): Observable<PriorityLevel> {
    return this.api
      .create(input)
      .pipe(tap((level) => this.list.update((levels) => [...levels, level])));
  }

  update(id: number, input: Partial<NameAndColor>): Observable<PriorityLevel> {
    return this.api.update(id, input).pipe(tap((level) => this.replace(level)));
  }

  setDefault(id: number): Observable<unknown> {
    return this.api
      .setDefault(id)
      .pipe(
        tap(() =>
          this.list.update((levels) =>
            levels.map((level) => ({ ...level, isDefault: level.id === id })),
          ),
        ),
      );
  }

  /** Deletes a level, moving its tasks (and its default flag) to `reassignTo`. */
  remove(id: number, reassignTo: number | null): Observable<DeletePriorityResult> {
    return this.api.delete(id, reassignTo).pipe(
      tap((result) => {
        const removed = this.byId(id);
        const target = result.reassignedTo ?? reassignTo;
        this.list.update((levels) =>
          levels
            .filter((level) => level.id !== id)
            .map((level) =>
              level.id === target
                ? {
                    ...level,
                    isDefault: level.isDefault || !!removed?.isDefault,
                    taskCount:
                      level.taskCount === null ? null : level.taskCount + result.tasksReassigned,
                  }
                : level,
            ),
        );
      }),
    );
  }

  /**
   * Shows the new order at once and saves it. If saving fails, the old order comes back and an
   * error toast says so.
   */
  reorder(orderedIds: readonly number[]): void {
    const previous = this.list();
    const position = new Map(orderedIds.map((id, index) => [id, index]));
    this.list.set(
      previous.map((level) => ({ ...level, sortOrder: position.get(level.id) ?? level.sortOrder })),
    );
    this.api.reorder(orderedIds).subscribe({
      error: () => {
        this.list.set(previous);
        this.toast.error(REORDER_FAILED_MESSAGE);
      },
    });
  }

  private replace(next: PriorityLevel): void {
    this.list.update((levels) => levels.map((level) => (level.id === next.id ? next : level)));
  }
}

/** Loads the user's priority levels whenever someone signs in, and clears them on sign-out. */
export function providePriorityLevels() {
  return provideEnvironmentInitializer(() => {
    const session = inject(SessionService);
    const store = inject(PrioritiesStore);
    effect(() => {
      const userId = session.currentUser()?.id;
      untracked(() => (userId ? store.load() : store.reset()));
    });
  });
}
