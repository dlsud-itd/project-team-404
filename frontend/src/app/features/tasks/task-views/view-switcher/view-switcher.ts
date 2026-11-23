import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** How a page shows its tasks. */
export type TaskView = 'list' | 'board';

/**
 * The List / Board switch. Each option is a link that sets one query parameter, so the view
 * survives reloads and Back, and the page's other parameters (filters, tab) are kept.
 */
@Component({
  selector: 'app-view-switcher',
  imports: [RouterLink],
  template: `
    <nav class="views" aria-label="Task views">
      @for (option of options; track option.view) {
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
      display: inline-block;
    }
    .views {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface));
    }
    .view {
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
        outline-offset: 2px;
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
  /** The query parameter that holds the view; the list is its absence. */
  readonly param = input('view');

  protected readonly options: { view: TaskView; label: string }[] = [
    { view: 'list', label: 'List' },
    { view: 'board', label: 'Board' },
  ];
  protected readonly params = computed(() => ({
    list: { [this.param()]: null },
    board: { [this.param()]: 'board' },
  }));
}
