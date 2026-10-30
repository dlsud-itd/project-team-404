import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Task } from '../../../shared/types/task.types';

/** "2026-10-02" → "Oct 2", with the year added when it is not the current year. */
export function formatDate(date: string, today: Date = new Date()): string {
  const [year, month, day] = date.split('-').map(Number);
  // Built from parts so the date stays local; new Date('YYYY-MM-DD') would be read as UTC.
  const local = new Date(year, month - 1, day);
  return local.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** "18:00:00" → "6:00 PM". */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

@Component({
  selector: 'app-task-item',
  imports: [RouterLink],
  template: `
    <article class="item" [class.done]="done()">
      <span
        class="priority"
        [attr.data-priority]="task().priorityId"
        [attr.aria-label]="'Priority ' + task().priorityId"
        >P{{ task().priorityId }}</span
      >

      <div class="body">
        <h3 class="title">{{ task().title }}</h3>
        @if (task().description; as description) {
          <p class="description">{{ description }}</p>
        }

        @if (due() || deadline() || task().isRecurring || done()) {
          <p class="meta">
            @if (due(); as due) {
              <span class="due">Due {{ due }}</span>
            }
            @if (deadline(); as deadline) {
              <span class="deadline">Deadline {{ deadline }}</span>
            }
            @if (task().isRecurring) {
              <span class="badge">Repeats</span>
            }
            @if (done()) {
              <span class="badge complete">Done</span>
            }
          </p>
        }

        @if (task().labels.length) {
          <ul class="labels" aria-label="Labels">
            @for (label of task().labels; track label.labelId) {
              <li class="label" [style.border-color]="label.color ?? null">{{ label.name }}</li>
            }
          </ul>
        }
      </div>

      <div class="actions">
        <a
          class="action edit"
          [routerLink]="['/projects', task().projectId, 'tasks', task().taskId, 'edit']"
          [attr.aria-label]="'Edit ' + task().title"
          >Edit</a
        >
        <button
          type="button"
          class="action delete"
          [attr.aria-label]="'Delete ' + task().title"
          (click)="deleteRequested.emit(task())"
        >
          Delete
        </button>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border: 1px solid var(--orange-light);
      border-radius: 0.75rem;
      background: #fff;
    }
    .done .title {
      color: var(--ink-muted);
      text-decoration: line-through;
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
      flex: 1;
      min-width: 0;
    }
    .title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .description {
      margin: 0.25rem 0 0;
      color: var(--ink-muted);
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
      white-space: pre-line;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      margin: 0.375rem 0 0;
      color: var(--ink-muted);
      font-size: 0.75rem;
    }
    .deadline {
      color: var(--error);
    }
    .badge {
      padding: 0 0.5rem;
      border-radius: 999px;
      background: #f3e2f7;
      color: #7b23a8;
      font-weight: 600;
    }
    .complete {
      background: #e6f4ea;
      color: var(--success);
    }
    .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.375rem 0 0;
      padding: 0;
      list-style: none;
    }
    .label {
      padding: 0 0.5rem;
      border: 1px solid #e6dcd7;
      border-radius: 999px;
      font-size: 0.6875rem;
    }
    .actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.375rem;
    }
    .action {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--field-border);
      border-radius: 999px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      &:hover {
        background: #fdeee6;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .delete {
      border-color: var(--error);
      color: var(--error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly deleteRequested = output<Task>();

  protected readonly done = computed(() => this.task().completedAt !== null);
  protected readonly due = computed(() => {
    const { dueDate, dueTime } = this.task();
    if (!dueDate) return null;
    return dueTime ? `${formatDate(dueDate)}, ${formatTime(dueTime)}` : formatDate(dueDate);
  });
  protected readonly deadline = computed(() => {
    const { deadline } = this.task();
    return deadline ? formatDate(deadline) : null;
  });
}
