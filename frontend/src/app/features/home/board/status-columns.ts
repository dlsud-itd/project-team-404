import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CollapseToggle } from '../../../shared/components/collapse-toggle/collapse-toggle';
import { ViewAllLink } from '../../../shared/components/view-all-link/view-all-link';
import { SettingsStore } from '../../settings/state/settings.store';
import { DashboardStore, type Task, type TaskStatus } from '../dashboard.store';
import { type DashboardWidget, DashboardWidgetsStore } from '../dashboard-widgets.store';

@Component({
  selector: 'app-status-columns',
  imports: [ViewAllLink, CollapseToggle],
  template: `
    @for (column of columns; track column.status) {
      <section
        class="column"
        [class.collapsed]="widgets.isCollapsed(column.status)"
        [attr.aria-labelledby]="'col-' + column.status"
      >
        <header class="head">
          <h2 [id]="'col-' + column.status" class="pill" [class]="'pill pill--' + column.status">
            {{ column.label }}
          </h2>
          <app-collapse-toggle
            [collapsed]="widgets.isCollapsed(column.status)"
            [controls]="'col-body-' + column.status"
            [name]="column.label + ' tasks'"
            (toggled)="widgets.toggle(column.status)"
          />
        </header>
        <div [id]="'col-body-' + column.status" [hidden]="widgets.isCollapsed(column.status)">
          <ul class="list" tabindex="0" [attr.aria-label]="column.label + ' tasks'">
            @for (task of visible(column.status); track task.id) {
              <li class="task">
                <span
                  class="dot"
                  [style.background]="store.projectById(task.projectId)?.color ?? null"
                ></span>
                <span class="title">{{ task.title }}</span>
                <span class="due">{{ shortDate(task.due) }}</span>
              </li>
            } @empty {
              <li class="empty">Nothing here</li>
            }
          </ul>
          <app-view-all-link
            class="more"
            [total]="store.byStatus()[column.status].length"
            [shown]="visible(column.status).length"
            link="/home"
            [queryParams]="{ tab: 'tasks' }"
            [noun]="column.label.toLowerCase() + ' tasks'"
          />
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
      gap: 1rem;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.625rem;
    }
    /* Folded away: just the title bar. */
    .column.collapsed {
      min-height: 0;
      .head {
        margin-bottom: 0;
      }
    }
    .column {
      position: relative;
      min-height: 11.75rem;
      padding: 0.875rem 0.75rem 0.75rem;
      border-radius: 0.75rem;
      background: var(--theme-surface);
      color: var(--theme-text);
      box-shadow: var(--elevation-1);
    }
    /*
     * Column headings stay neutral: red, orange and blue are reserved for priority. Only the
     * current column takes the accent.
     */
    .pill {
      display: inline-block;
      margin: 0;
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      background: var(--active-bg);
      color: var(--ink-muted);
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .pill--current {
      background: color-mix(in srgb, var(--ink) 10%, transparent);
      color: var(--ink);
    }
    /* A fixed maximum height: long columns scroll inside the card. */
    .list {
      display: grid;
      gap: 0.375rem;
      max-height: 12rem;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      list-style: none;
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
    .more {
      text-align: center;
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
      background: var(--ink-muted);
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
  protected readonly widgets = inject(DashboardWidgetsStore);
  private readonly settings = inject(SettingsStore);
  protected readonly columns: { status: TaskStatus & DashboardWidget; label: string }[] = [
    { status: 'current', label: 'Current' },
    { status: 'upcoming', label: 'Upcoming' },
    { status: 'overdue', label: 'Overdue' },
  ];

  /** A column's tasks, capped at the user's "tasks per dashboard widget" setting. */
  protected visible(status: TaskStatus): Task[] {
    return this.store.byStatus()[status].slice(0, this.settings.taskLimit());
  }

  protected shortDate(key: string | null): string {
    if (!key) return 'No due date';
    return new Date(`${key}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
