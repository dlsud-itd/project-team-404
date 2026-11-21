import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounce,
  distinctUntilChanged,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import {
  SEARCH_DEBOUNCE_MS,
  MAX_QUERY_LENGTH,
  SearchService,
  isSearchable,
} from '../../services/search.service';
import type { SearchResult, SearchResults as Results, SearchState } from '../../types/search.types';
import { SearchResults, resultId } from '../search-results/search-results';

interface SearchRequest {
  q: string;
  includeArchived: boolean;
  /** Toggling archived or retrying searches straight away instead of waiting for typing. */
  immediate: boolean;
  /** Changes on retry, so the same query is sent again. */
  attempt: number;
}

const ID = 'global-search';

/** Whether a key press happened while typing somewhere, where `/` must stay a slash. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * The search field in the top bar. Ctrl/Cmd+K or `/` focuses it; typing searches after a pause
 * (from two characters, dropping answers to older queries); results drop down below it as an
 * ARIA combobox: arrow keys move, Enter opens, Escape closes.
 */
@Component({
  selector: 'app-search-box',
  imports: [SearchResults],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKey($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class SearchBox {
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly id = ID;
  protected readonly maxLength = MAX_QUERY_LENGTH;
  protected readonly shortcut =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
      ? '⌘K'
      : 'Ctrl K';

  protected readonly query = signal('');
  protected readonly includeArchived = signal(false);
  protected readonly state = signal<SearchState>('idle');
  protected readonly results = signal<Results | null>(null);
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  private attempt = 0;

  /** Results with project names, priorities and due dates filled in from the stores. */
  protected readonly rows = computed(() => {
    const results = this.results();
    return results ? this.search.toRows(results) : { tasks: [], projects: [] };
  });
  /** Every option in the order shown: tasks, then projects. */
  protected readonly options = computed<SearchResult[]>(() => [
    ...this.rows().tasks,
    ...this.rows().projects,
  ]);
  protected readonly counts = computed(() => this.results()?.counts ?? { tasks: 0, projects: 0 });
  protected readonly expanded = computed(
    () => this.open() && isSearchable(this.query()) && this.state() !== 'idle',
  );
  protected readonly activeId = computed(() => {
    const option = this.options()[this.activeIndex()];
    return option ? resultId(ID, option) : null;
  });
  /** Read out by screen readers when results arrive. */
  protected readonly announcement = computed(() => {
    if (!this.expanded()) return '';
    if (this.state() === 'loading') return 'Searching';
    if (this.state() === 'error') return 'Search failed';
    if (this.state() !== 'done') return '';
    const { tasks, projects } = this.counts();
    if (tasks + projects === 0) return 'No results';
    return `${tasks} ${tasks === 1 ? 'task' : 'tasks'} and ${projects} ${projects === 1 ? 'project' : 'projects'} found`;
  });

  private readonly requests = new Subject<SearchRequest>();

  constructor() {
    this.requests
      .pipe(
        debounce((request) => timer(request.immediate ? 0 : SEARCH_DEBOUNCE_MS)),
        distinctUntilChanged(
          (a, b) =>
            a.q === b.q && a.includeArchived === b.includeArchived && a.attempt === b.attempt,
        ),
        // switchMap drops the answer to an older query when a newer one is sent.
        switchMap((request) => {
          if (!isSearchable(request.q)) {
            this.state.set('idle');
            this.results.set(null);
            return EMPTY;
          }
          this.state.set('loading');
          return this.search.search(request.q, { includeArchived: request.includeArchived }).pipe(
            tap((results) => {
              this.results.set(results);
              this.activeIndex.set(-1);
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
    this.query.set(value);
    this.open.set(true);
    if (!isSearchable(value)) {
      // Nothing to wait for; clear straight away.
      this.state.set('idle');
      this.results.set(null);
    }
    this.send(false);
  }

  protected setIncludeArchived(value: boolean): void {
    this.includeArchived.set(value);
    this.send(true);
    this.focus();
  }

  protected retry(): void {
    this.attempt++;
    this.send(true);
    this.focus();
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.expanded()) {
          this.open.set(true);
          return;
        }
        if (!count) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const current = this.activeIndex();
        const next =
          current === -1 ? (step === 1 ? 0 : count - 1) : (current + step + count) % count;
        this.activeIndex.set(next);
        this.scrollActiveIntoView();
        return;
      }
      case 'Enter': {
        event.preventDefault();
        const active = this.options()[this.activeIndex()];
        if (this.expanded() && active) this.openResult(active);
        else if (isSearchable(this.query())) this.openPage();
        return;
      }
      case 'Escape':
        event.preventDefault();
        if (this.expanded()) this.close();
        else this.input().nativeElement.blur();
        return;
    }
  }

  /** Ctrl/Cmd+K anywhere, or `/` outside a text field, jumps to the search box. */
  protected onDocumentKey(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const isK =
      event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey;
    const isSlash =
      event.key === '/' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !isEditable(event.target);
    if (!isK && !isSlash) return;
    event.preventDefault();
    this.focus();
    this.input().nativeElement.select();
  }

  /** Clicking or tabbing away from the box and its results closes them. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    this.close();
  }

  protected onFocus(): void {
    this.open.set(true);
  }

  protected setActive(result: SearchResult): void {
    this.activeIndex.set(this.options().indexOf(result));
  }

  protected openResult(result: SearchResult): void {
    this.close();
    this.input().nativeElement.blur();
    void this.search.open(result);
  }

  protected openPage(): void {
    const q = this.query().trim();
    this.close();
    this.input().nativeElement.blur();
    void this.router.navigate(['/search'], {
      queryParams: { q, archived: this.includeArchived() ? 'true' : null },
    });
  }

  private close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  private focus(): void {
    this.input().nativeElement.focus();
    this.open.set(true);
  }

  private send(immediate: boolean): void {
    this.requests.next({
      q: this.query().trim(),
      includeArchived: this.includeArchived(),
      immediate,
      attempt: this.attempt,
    });
  }

  private scrollActiveIntoView(): void {
    const id = this.activeId();
    if (!id) return;
    queueMicrotask(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(`#${id}`);
      el?.scrollIntoView?.({ block: 'nearest' });
    });
  }
}
