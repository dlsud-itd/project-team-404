import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../auth/session/session.service';
import { PrioritiesStore } from '../../../../settings/state/priorities.store';
import type { Task } from '../../../shared/types/task.types';
import {
  formatDate,
  instantToDate,
  userTimeZone,
} from '../../../task-scheduling/utils/date-format.util';
import { recurrenceSummary } from '../../../task-scheduling/utils/recurrence-label.util';
import { StreakBadge } from '../../../task-streaks/components/streak-badge/streak-badge';
import { ArchiveAction } from '../../../../archive/components/archive-action/archive-action';
import type { ArchiveHooks } from '../../../../archive/services/archive-undo.service';
import { TasksStore } from '../../../shared/state/tasks.store';

@Component({
  selector: 'app-task-item',
  imports: [RouterLink, StreakBadge, ArchiveAction],
  template: `
    <!-- Priority shows as a tint, a left accent and its name in the meta line. -->
    <article
      class="item priority-tint"
      [class.done]="done()"
      [attr.data-priority]="task().priorityId"
      [style.--priority-bg]="tone().bg"
      [style.--priority-accent]="tone().accent"
      [attr.title]="'Priority: ' + tone().name"
    >
      <div class="body">
        <h3 class="title">
          <span class="strike-sweep">{{ task().title }}</span>
        </h3>
        <span class="visually-hidden">{{ tone().name }} priority</span>
        @if (task().description; as description) {
          <p class="description">{{ description }}</p>
        }

        <p class="meta">
          <span class="priority-name" aria-hidden="true">{{ tone().name }}</span>
          @if (scheduled(); as scheduled) {
            <span class="scheduled">Scheduled {{ scheduled }}</span>
          }
          @if (due(); as due) {
            <span class="due">Due {{ due }}</span>
          }
          @if (deadline(); as deadline) {
            <span class="deadline">Deadline {{ deadline }}</span>
          }
          @if (repeats(); as repeats) {
            <span class="badge">{{ repeats }}</span>
          }
          @if (task().isRecurring) {
            <app-streak-badge [task]="task()" />
          }
          @if (done()) {
            <span class="badge complete">Done</span>
          }
        </p>

        @if (task().labels.length) {
          <ul class="labels" aria-label="Labels">
            @for (label of task().labels; track label.labelId) {
              <li
                class="label"
                [class.archived]="label.isArchived"
                [attr.title]="label.isArchived ? label.name + ' (archived)' : null"
              >
                {{ label.name }}
              </li>
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
        <app-archive-action
          kind="task"
          [itemId]="task().taskId"
          [name]="task().title"
          [hooks]="archiveHooks"
        />
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
      padding: 0.875rem 1rem 0.875rem 1.125rem;
      border: 1px solid var(--divider);
      border-radius: 0.5rem;
      background-color: var(--theme-surface);
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background-color: color-mix(in srgb, var(--theme-surface), var(--theme-text) 3%);
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
    /* A small square in the priority color, the same mark as the row's edge, then the name. */
    .priority-name {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--ink);
      &::before {
        content: '';
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 2px;
        background: var(--priority-accent, var(--priority-none-accent));
      }
    }
    .badge {
      padding: 0 0.375rem;
      border-radius: 0.375rem;
      background: var(--active-bg);
      color: var(--ink-muted);
      font-weight: 500;
    }
    .complete {
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
      border: 1px solid var(--divider);
      border-radius: 0.375rem;
      font-size: 0.75rem;
      &.archived {
        border-style: dashed;
        color: var(--ink-muted);
        opacity: 0.6;
      }
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      flex-shrink: 0;
      justify-content: flex-end;
      gap: 0.375rem;
      --archive-action-font-size: 0.75rem;
      --archive-action-padding: 0.25rem 0.75rem;
      --archive-action-glyph: inline-block;
    }
    .action {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--divider);
      border-radius: 0.5rem;
      background: var(--theme-surface);
      color: var(--ink);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background: var(--hover-bg);
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskItem {
  readonly task = input.required<Task>();

  private readonly tasksStore = inject(TasksStore);
  /** Archiving hides the task from the list at once; a failure or Undo brings it back. */
  protected readonly archiveHooks = (taskId: number): ArchiveHooks => ({
    apply: () => this.tasksStore.patch(taskId, { isArchived: true }),
    rollback: () => this.tasksStore.patch(taskId, { isArchived: false }),
  });

  private readonly session = inject(SessionService);

  protected readonly done = computed(() => this.task().completedAt !== null);
  private readonly priorities = inject(PrioritiesStore);
  /** The tint, left accent and name of the task's priority. */
  protected readonly tone = computed(() => this.priorities.toneOf(this.task().priorityId));
  protected readonly repeats = computed(() => {
    const { recurrence, recurrenceDays, recurrenceEndDate } = this.task();
    return recurrenceSummary(recurrence, recurrenceDays, recurrenceEndDate);
  });
  protected readonly due = computed(() => {
    const { dueDate } = this.task();
    return dueDate ? formatDate(dueDate) : null;
  });
  protected readonly scheduled = computed(() => {
    const { scheduledDate } = this.task();
    return scheduledDate ? formatDate(scheduledDate) : null;
  });
  protected readonly deadline = computed(() => {
    const { deadline } = this.task();
    if (!deadline) return null;
    const timeZone = userTimeZone(this.session.currentUser()?.timezone);
    return formatDate(instantToDate(deadline, timeZone));
  });
}
