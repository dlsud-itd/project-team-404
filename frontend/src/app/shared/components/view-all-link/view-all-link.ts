import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';

/**
 * "View all (N)" under a capped dashboard list. Renders nothing unless the list hides some items.
 */
@Component({
  selector: 'app-view-all-link',
  imports: [RouterLink],
  template: `
    @if (total() > shown()) {
      <a
        class="view-all"
        [routerLink]="link()"
        [queryParams]="queryParams()"
        [attr.aria-label]="'View all ' + total() + ' ' + noun()"
        >View all ({{ total() }})</a
      >
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .view-all {
      display: inline-block;
      margin-top: 0.5rem;
      color: var(--orange);
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAllLink {
  /** Everything that matches, shown or not. */
  readonly total = input.required<number>();
  /** How many the list shows. */
  readonly shown = input.required<number>();
  readonly link = input.required<string | readonly unknown[]>();
  readonly queryParams = input<Params | null>(null);
  /** What the items are, for the link's accessible name, e.g. "overdue tasks". */
  readonly noun = input('items');
}
