import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore, type TaskStatus } from '../dashboard.store';

@Component({
  selector: 'app-status-columns',
  template: `
    @for (column of columns; track column.status) {
      <section class="column" [attr.aria-labelledby]="'col-' + column.status">
        <h2 [id]="'col-' + column.status" class="pill" [class]="'pill pill--' + column.status">
          {{ column.label }}
        </h2>
        <ul class="list">
          @for (task of store.byStatus()[column.status]; track task.id) {
            <li class="task">
              <span
                class="dot"
                [style.background]="store.projectById(task.projectId)?.color ?? '#bbb'"
              ></span>
              <span class="title">{{ task.title }}</span>
              <span class="due">{{ shortDate(task.due) }}</span>
            </li>
          } @empty {
            <li class="empty">Nothing here</li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .column {
      position: relative;
      min-height: 11.75rem;
      padding: 1.75rem 0.75rem 0.75rem;
      border: 1px solid var(--orange-light);
      border-radius: 0.75rem;
      background: #fff;
    }
    .pill {
      position: absolute;
      top: -0.375rem;
      left: 50%;
      transform: translateX(-50%);
      margin: 0;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .pill--current {
      background: #7b23a8;
    }
    .pill--upcoming {
      background: #f0957a;
    }
    .pill--overdue {
      background: var(--ink);
    }
    .list {
      display: grid;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .task {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .due {
      color: var(--ink-muted);
      font-size: 0.6875rem;
    }
    .empty {
      color: var(--ink-muted);
      font-size: 0.75rem;
      text-align: center;
    }
    @media (max-width: 640px) {
      :host {
        grid-template-columns: 1fr;
        row-gap: 1.25rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusColumns {
  protected readonly store = inject(DashboardStore);
  protected readonly columns: { status: TaskStatus; label: string }[] = [
    { status: 'current', label: 'Current' },
    { status: 'upcoming', label: 'Upcoming' },
    { status: 'overdue', label: 'Overdue' },
  ];

  protected shortDate(key: string): string {
    return new Date(`${key}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
