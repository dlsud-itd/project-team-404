import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrioritiesStore } from '../../settings/state/priorities.store';
import { DashboardStore } from '../dashboard.store';

/**
 * The home sidebar's priority levels, in the user's order, as task filters. Each row's chip is
 * the same tint and left accent the tasks use, so the list doubles as the dashboard's legend.
 */
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
              <span class="label">
                <span
                  class="chip"
                  aria-hidden="true"
                  [style.--priority-bg]="priorities.toneOf(level.id).bg"
                  [style.--priority-accent]="priorities.toneOf(level.id).accent"
                ></span>
                {{ level.name }}
              </span>
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
      gap: 0.125rem;
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
      padding: 0.375rem 0.5rem;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 400;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background: var(--hover-bg);
      }
      &.active {
        background: var(--active-bg);
        color: var(--ink);
        font-weight: 500;
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 1px;
      }
    }
    .label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip {
      width: 0.875rem;
      height: 0.75rem;
      flex: none;
      border-radius: 2px;
      background: var(--priority-bg);
      box-shadow:
        inset 3px 0 0 var(--priority-accent),
        inset 0 0 0 1px var(--divider);
    }
    .count {
      color: var(--ink-muted);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityList {
  protected readonly store = inject(DashboardStore);
  protected readonly priorities = inject(PrioritiesStore);

  protected toggle(priorityId: number): void {
    this.store.filter.update((f) => (f.priorityId === priorityId ? {} : { priorityId }));
  }
}
