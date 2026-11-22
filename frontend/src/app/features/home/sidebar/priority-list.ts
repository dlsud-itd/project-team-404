import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrioritiesStore } from '../../settings/state/priorities.store';
import { DashboardStore } from '../dashboard.store';

/** The home sidebar's priority levels, in the user's order and colors, as task filters. */
@Component({
  selector: 'app-priority-list',
  template: `
    <section class="card" aria-labelledby="priorities-heading">
      <h2 id="priorities-heading">Priorities</h2>
      <ul class="list">
        @for (level of priorities.levels(); track level.id) {
          <li>
            <button
              type="button"
              class="row"
              [class.active]="store.filter().priorityId === level.id"
              [attr.aria-pressed]="store.filter().priorityId === level.id"
              (click)="toggle(level.id)"
            >
              <span class="badge" [style.background-color]="level.color ?? noColor">{{
                level.name
              }}</span>
              <span class="count">{{ store.priorityCounts().get(level.id) ?? 0 }}</span>
            </button>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.125rem;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.6875rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      &:hover,
      &.active {
        background: #fdeee6;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 1px;
      }
    }
    .badge {
      min-width: 3rem;
      max-width: 75%;
      overflow: hidden;
      padding: 0.375rem 0.75rem 0.375rem 0.375rem;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.625rem;
      text-overflow: ellipsis;
      text-shadow: 0 0 2px rgb(0 0 0 / 0.35);
      white-space: nowrap;
    }
    .count {
      margin-right: 0.75rem;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityList {
  protected readonly store = inject(DashboardStore);
  protected readonly priorities = inject(PrioritiesStore);
  protected readonly noColor = '#A8A29E';

  protected toggle(priorityId: number): void {
    this.store.filter.update((f) => (f.priorityId === priorityId ? {} : { priorityId }));
  }
}
