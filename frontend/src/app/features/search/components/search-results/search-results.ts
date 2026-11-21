import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type {
  SearchProjectResult,
  SearchResult,
  SearchState,
  SearchTaskResult,
} from '../../types/search.types';
import { highlightMatch } from '../../utils/highlight-match.util';

/** The id of a result's row, shared with the combobox for aria-activedescendant. */
export function resultId(prefix: string, result: SearchResult): string {
  return `${prefix}-${result.kind}-${result.id}`;
}

/**
 * Search results grouped into Tasks and Projects. In the header dropdown it is the combobox's
 * listbox (the input keeps focus and points at the active option); on the search page it is a
 * plain list of buttons.
 */
@Component({
  selector: 'app-search-results',
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults {
  readonly tasks = input<SearchTaskResult[]>([]);
  readonly projects = input<SearchProjectResult[]>([]);
  /** Server totals, which can be more than the rows shown. */
  readonly counts = input<{ tasks: number; projects: number }>({ tasks: 0, projects: 0 });
  readonly query = input('');
  readonly state = input<SearchState>('idle');
  readonly mode = input<'dropdown' | 'page'>('dropdown');
  /** Prefix for row ids; the listbox itself gets `${idPrefix}-listbox`. */
  readonly idPrefix = input('search');
  /** The row the keyboard is on, from resultId; dropdown only. */
  readonly activeId = input<string | null>(null);
  readonly includeArchived = input(false);
  /** Hide a group, as the search page's Tasks and Projects tabs do. */
  readonly show = input<'all' | 'tasks' | 'projects'>('all');

  readonly opened = output<SearchResult>();
  readonly activated = output<SearchResult>();
  readonly includeArchivedChange = output<boolean>();
  readonly retry = output<void>();
  readonly seeAll = output<void>();

  protected readonly highlight = highlightMatch;
  protected readonly rowId = (result: SearchResult) => resultId(this.idPrefix(), result);

  protected readonly showTasks = computed(
    () => this.show() !== 'projects' && this.tasks().length > 0,
  );
  protected readonly showProjects = computed(
    () => this.show() !== 'tasks' && this.projects().length > 0,
  );
  protected readonly empty = computed(
    () => this.state() === 'done' && !this.showTasks() && !this.showProjects(),
  );
  /** More matches on the server than the dropdown shows. */
  protected readonly hasMore = computed(
    () =>
      this.counts().tasks > this.tasks().length || this.counts().projects > this.projects().length,
  );
}
