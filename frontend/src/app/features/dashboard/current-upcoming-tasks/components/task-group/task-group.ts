import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabelChip } from '../../../../labels/components/label-chip/label-chip';
import { formatDate, formatTime } from '../../../../tasks/task-crud/components/task-item/task-item';
import type { DashboardTask } from '../../../shared/types/dashboard.types';
import type { DayGroup } from '../../types/current-upcoming.types';

const EMPTY_TEXT: Record<DayGroup['key'], string> = {
  today: 'Nothing due today.',
  tomorrow: 'Nothing due tomorrow.',
  later: 'Nothing else coming up.',
};

/** One day bucket of the Current & upcoming section: a heading with a count, then its tasks. */
@Component({
  selector: 'app-task-group',
  imports: [RouterLink, LabelChip],
  template: `
    <section class="group" [attr.aria-labelledby]="headingId()" [attr.data-day]="group().key">
      <header class="head">
        <h3 [id]="headingId()">{{ group().title }}</h3>
        <span class="count" [attr.aria-label]="countLabel()">{{ group().tasks.length }}</span>
        @if (dateLabel(); as date) {
          <span class="date">{{ date }}</span>
        }
      </header>

      @if (group().tasks.length) {
        <ul class="tasks">
          @for (task of group().tasks; track task.taskId) {
            <li class="task">
              <span
                class="priority"
                [attr.data-priority]="task.priorityId"
                [attr.aria-label]="'Priority ' + task.priorityId"
                >P{{ task.priorityId }}</span
              >
              <div class="body">
                <a
                  class="title"
                  [routerLink]="['/projects', task.projectId, 'tasks', task.taskId, 'edit']"
                  >{{ task.title }}</a
                >
                @if (when(task); as when) {
                  <span class="when">{{ when }}</span>
                }
                @if (task.deadline; as deadline) {
                  <span class="deadline">Deadline {{ format(deadline) }}</span>
                }
                @if (task.labels.length) {
                  <ul class="labels" aria-label="Labels">
                    @for (label of task.labels; track label.labelId) {
                      <li><app-label-chip [label]="label" /></li>
                    }
                  </ul>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">{{ emptyText() ?? defaultEmptyText() }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .group {
      padding: 1rem;
      border: 1px solid var(--orange-light);
      border-radius: 0.75rem;
      background: #fff;
    }
    .head {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.625rem;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }
    .count {
      min-width: 1.5rem;
      padding: 0 0.375rem;
      border-radius: 999px;
      background: #fdeee6;
      color: var(--brown);
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
    }
    .date {
      margin-left: auto;
      color: var(--ink-muted);
      font-size: 0.75rem;
    }
    .tasks,
    .labels {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .tasks {
      display: grid;
      gap: 0.5rem;
    }
    .task {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3e6df;
      &:first-child {
        padding-top: 0;
        border-top: 0;
      }
    }
    .priority {
      flex-shrink: 0;
      min-width: 1.875rem;
      padding: 0.0625rem 0.375rem;
      border: 1px solid #6b7280;
      border-radius: 999px;
      color: #4b5563;
      font-size: 0.6875rem;
      font-weight: 700;
      text-align: center;
      &[data-priority='1'] {
        border-color: #dc2626;
        background: #fdecec;
        color: #b91c1c;
      }
      &[data-priority='2'] {
        border-color: #ea580c;
        background: #fff1e8;
        color: #c2410c;
      }
      &[data-priority='3'] {
        border-color: #2563eb;
        background: #eef3fe;
        color: #1d4ed8;
      }
    }
    .body {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.625rem;
      min-width: 0;
    }
    .title {
      flex-basis: 100%;
      color: var(--ink);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;
      &:hover {
        text-decoration: underline;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .when,
    .deadline {
      color: var(--ink-muted);
      font-size: 0.75rem;
    }
    .deadline {
      color: var(--error);
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .empty {
      margin: 0;
      color: var(--ink-muted);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskGroup {
  readonly group = input.required<DayGroup>();
  /** Overrides the message shown when the group has no tasks. */
  readonly emptyText = input<string | null>(null);

  protected readonly headingId = computed(() => `task-group-${this.group().key}`);
  protected readonly defaultEmptyText = computed(() => EMPTY_TEXT[this.group().key]);
  protected readonly dateLabel = computed(() => {
    const date = this.group().date;
    return date ? formatDate(date) : null;
  });
  protected readonly countLabel = computed(() => {
    const n = this.group().tasks.length;
    return `${n} ${n === 1 ? 'task' : 'tasks'}`;
  });

  protected format(date: string): string {
    return formatDate(date);
  }

  /**
   * When the task is due, as briefly as the group allows: Today and Tomorrow already name the day,
   * so they show only a time; Later shows the date too.
   */
  protected when(task: DashboardTask): string | null {
    const time = task.dueTime ? formatTime(task.dueTime) : null;
    if (this.group().key !== 'later') return time;
    if (!task.dueDate) return null;
    const date = formatDate(task.dueDate);
    return time ? `${date}, ${time}` : date;
  }
}
