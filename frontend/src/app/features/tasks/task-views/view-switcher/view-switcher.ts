import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import { TASK_VIEW_OPTIONS, type TaskView } from '../types/task-view.types';

export type { TaskView } from '../types/task-view.types';

/**
 * The view a query parameter names on a page without a table (Home's Tasks tab); anything else,
 * or nothing, is the list.
 */
export function toTaskView(value: string | null): TaskView {
  return value === 'board' || value === 'timeline' ? value : 'list';
}

/**
 * The List | Table | Board | Timeline switch. Each option is a link that sets one query
 * parameter, so the view survives reloads and Back, and the page's other parameters (filters,
 * tab) are kept. Every option names its view, List included, so picking List also wins over a
 * view the page remembered.
 */
@Component({
  selector: 'app-view-switcher',
  imports: [RouterLink],
  template: `
    <nav class="views" aria-label="Task views">
      @for (option of options(); track option.view) {
        <a
          class="view"
          [routerLink]="[]"
          [queryParams]="params()[option.view]"
          queryParamsHandling="merge"
          [attr.aria-current]="view() === option.view ? 'page' : null"
          >{{ option.label }}</a
        >
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }
    .views {
      display: inline-flex;
      gap: 0.25rem;
      max-width: 100%;
      padding: 0.25rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface));
      /* Four options can outgrow a phone; the control scrolls instead of the page. */
      overflow-x: auto;
      scrollbar-width: none;
    }
    .view {
      flex: none;
      padding: 0.375rem 1rem;
      border-radius: 999px;
      color: var(--ink-muted);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      &:hover {
        color: var(--ink);
      }
      &[aria-current='page'] {
        background: var(--theme-surface);
        color: var(--ink);
        box-shadow: 0 1px 2px rgb(29 23 20 / 0.08);
      }
      &:focus-visible {
        outline: 2px solid var(--ink);
        outline-offset: -2px;
      }
      @media (pointer: coarse) {
        padding-block: 0.625rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewSwitcher {
  readonly view = input.required<TaskView>();
  /** The query parameter that holds the view. */
  readonly param = input('view');
  /** The views this page offers, shown in the usual order. */
  readonly views = input<readonly TaskView[]>(TASK_VIEW_OPTIONS.map((option) => option.view));

  protected readonly options = computed(() =>
    TASK_VIEW_OPTIONS.filter((option) => this.views().includes(option.view)),
  );
  /** Each view's query params, built once per param name so the links stay stable. */
  protected readonly params = computed(
    () =>
      Object.fromEntries(
        TASK_VIEW_OPTIONS.map(({ view }) => [view, { [this.param()]: view }]),
      ) as Record<TaskView, Params>,
  );
}
