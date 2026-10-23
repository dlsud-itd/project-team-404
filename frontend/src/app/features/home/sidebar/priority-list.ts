import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore, PRIORITIES, type Priority } from '../dashboard.store';

@Component({
  selector: 'app-priority-list',
  template: `
    <section class="card" aria-labelledby="priorities-heading">
      <h2 id="priorities-heading">Priorities</h2>
      <ul class="list">
        @for (p of priorities; track p.value) {
          <li>
            <button
              type="button"
              class="row"
              [class.active]="store.filter().priority === p.value"
              [attr.aria-pressed]="store.filter().priority === p.value"
              (click)="toggle(p.value)"
            >
              <span class="badge" [class]="'badge badge--' + p.value">{{ p.label }}</span>
              <span class="hint">{{ p.hint }}</span>
              <span class="count">{{ store.priorityCounts()[p.value] }}</span>
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
      padding: 0.375rem 0.375rem;
      border-radius: 0.375rem;
      font-size: 0.625rem;
    }
    .badge--high {
      background: var(--ink);
      color: #fff;
    }
    .badge--medium {
      min-width: 3rem;
      padding-inline: 0.75rem 1.5rem;
      background: #7b23a8;
      color: #fff;
    }
    .badge--low {
      background: #ebb49c;
      color: #fff;
    }
    .hint {
      flex: 1;
      font-size: 0.625rem;
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
  protected readonly priorities = PRIORITIES;

  protected toggle(priority: Priority): void {
    this.store.filter.update((f) => (f.priority === priority ? {} : { priority }));
  }
}
