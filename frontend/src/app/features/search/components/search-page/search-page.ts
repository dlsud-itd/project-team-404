import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  switchMap,
  tap,
} from 'rxjs';
import {
  MAX_QUERY_LENGTH,
  PAGE_LIMIT,
  SEARCH_DEBOUNCE_MS,
  SearchService,
  isSearchable,
} from '../../services/search.service';
import {
  SEARCH_TYPES,
  type SearchResult,
  type SearchResults as Results,
  type SearchState,
  type SearchType,
} from '../../types/search.types';
import { SearchResults } from '../search-results/search-results';

/** Reads the `type` query parameter; anything unknown means All. */
export function asSearchType(value: unknown): SearchType {
  return SEARCH_TYPES.find((type) => type === value) ?? 'all';
}

const TAB_LABEL: Record<SearchType, string> = { all: 'All', tasks: 'Tasks', projects: 'Projects' };

interface PageParams {
  q: string;
  type: SearchType;
  includeArchived: boolean;
}

function readParams(params: { get(name: string): string | null }): PageParams {
  return {
    q: (params.get('q') ?? '').trim(),
    type: asSearchType(params.get('type')),
    includeArchived: params.get('archived') === 'true',
  };
}

/**
 * /search?q=: every match for a query, up to the server's limit, with All, Tasks and Projects
 * tabs. The query, tab and archived switch live in the URL so results can be linked and reloaded.
 */
@Component({
  selector: 'app-search-page',
  imports: [RouterLink, SearchResults],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {
  private readonly search = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = SEARCH_TYPES;
  protected readonly tabLabel = TAB_LABEL;
  protected readonly maxLength = MAX_QUERY_LENGTH;

  private readonly params = toSignal(this.route.queryParamMap.pipe(map(readParams)), {
    initialValue: readParams(this.route.snapshot.queryParamMap),
  });
  protected readonly type = computed(() => this.params().type);
  protected readonly includeArchived = computed(() => this.params().includeArchived);

  /** What is in the field; the URL catches up after a pause in typing. */
  protected readonly draft = signal(this.params().q);
  protected readonly state = signal<SearchState>('idle');
  protected readonly results = signal<Results | null>(null);

  protected readonly rows = computed(() => {
    const results = this.results();
    return results ? this.search.toRows(results) : { tasks: [], projects: [] };
  });
  protected readonly counts = computed(() => this.results()?.counts ?? { tasks: 0, projects: 0 });
  protected readonly tooShort = computed(
    () => this.draft().trim().length > 0 && !isSearchable(this.draft()),
  );
  /** Matches the server has beyond the ones shown. */
  protected readonly truncated = computed(() => {
    const { tasks, projects } = this.counts();
    const shownTasks = this.rows().tasks.length;
    const shownProjects = this.rows().projects.length;
    const type = this.type();
    const hidden =
      (type !== 'projects' ? tasks - shownTasks : 0) +
      (type !== 'tasks' ? projects - shownProjects : 0);
    return hidden > 0 ? hidden : 0;
  });

  private readonly typed = new Subject<string>();
  private readonly retries = new Subject<void>();

  constructor() {
    // Typing updates the URL after a pause; the URL drives the search below.
    this.typed
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.setParams({ q: q || null }, true));

    const fromUrl = this.route.queryParamMap.pipe(
      map(readParams),
      distinctUntilChanged((a, b) => a.q === b.q && a.includeArchived === b.includeArchived),
      tap((params) => {
        // Back and forward change the URL without typing.
        if (params.q !== this.draft().trim()) this.draft.set(params.q);
      }),
    );
    const retried = this.retries.pipe(map(() => this.params()));

    merge(fromUrl, retried)
      .pipe(
        switchMap((params) => {
          if (!isSearchable(params.q)) {
            this.state.set('idle');
            this.results.set(null);
            return EMPTY;
          }
          this.state.set('loading');
          return this.search
            .search(params.q, { limit: PAGE_LIMIT, includeArchived: params.includeArchived })
            .pipe(
              tap((results) => {
                this.results.set(results);
                this.state.set('done');
              }),
              catchError(() => {
                this.state.set('error');
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected onInput(value: string): void {
    this.draft.set(value);
    this.typed.next(value.trim());
  }

  /** Enter searches straight away. */
  protected submit(event: Event): void {
    event.preventDefault();
    const q = this.draft().trim();
    this.setParams({ q: q || null }, true);
  }

  protected count(type: SearchType): number | null {
    if (!this.results()) return null;
    const { tasks, projects } = this.counts();
    return type === 'tasks' ? tasks : type === 'projects' ? projects : tasks + projects;
  }

  protected select(type: SearchType): void {
    this.setParams({ type: type === 'all' ? null : type }, true);
  }

  protected setIncludeArchived(value: boolean): void {
    this.setParams({ archived: value ? 'true' : null }, true);
  }

  protected retry(): void {
    this.retries.next();
  }

  protected open(result: SearchResult): void {
    void this.search.open(result);
  }

  /** Arrow keys, Home and End move between tabs, as in the ARIA tabs pattern. */
  protected onTabKey(event: KeyboardEvent): void {
    const last = SEARCH_TYPES.length - 1;
    const current = SEARCH_TYPES.indexOf(this.type());
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % SEARCH_TYPES.length
        : event.key === 'ArrowLeft'
          ? (current + last) % SEARCH_TYPES.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    this.select(SEARCH_TYPES[next]);
    const tablist = event.currentTarget as HTMLElement | null;
    tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  private setParams(params: Record<string, string | null>, replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
