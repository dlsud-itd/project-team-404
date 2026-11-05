import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { Label } from '../../../../labels/types/label.types';
import { PriorityPicker } from '../priority-picker/priority-picker';
import {
  DEFAULT_TASK_FILTERS,
  TASK_ORDER_OPTIONS,
  type TaskFilters,
  type TaskOrderBy,
  type TaskPriority,
} from '../../types/task-organization.types';
import { isDefaultFilters } from '../../utils/filter-query.util';

let nextId = 0;

/**
 * Priority, label and sort controls for a task list. The filters are a two-way binding; the host
 * page loads the list and, with filter-query.util, keeps the filters in the URL.
 */
@Component({
  selector: 'app-task-filter-bar',
  imports: [PriorityPicker],
  template: `
    <section class="bar" aria-label="Filter and sort tasks">
      <app-priority-picker
        legend="Priority"
        [allowNone]="true"
        noneLabel="Any"
        [disabled]="disabled()"
        [value]="filters().priority"
        (valueChange)="setPriority($event)"
      />

      <div class="selects">
        <div class="field">
          <label [for]="labelSelectId">Label</label>
          <select
            [id]="labelSelectId"
            class="label-select"
            [disabled]="disabled()"
            (change)="setLabel($any($event.target).value)"
          >
            <option value="" [selected]="filters().labelId === null">Any label</option>
            @for (label of labels(); track label.labelId) {
              <option [value]="label.labelId" [selected]="filters().labelId === label.labelId">
                {{ label.name }}
              </option>
            }
            @if (missingLabel()) {
              <option [value]="filters().labelId" selected>Deleted label</option>
            }
          </select>
        </div>

        <div class="field">
          <label [for]="sortSelectId">Sort by</label>
          <div class="sort">
            <select
              [id]="sortSelectId"
              class="sort-select"
              [disabled]="disabled()"
              (change)="setOrderBy($any($event.target).value)"
            >
              <option value="" [selected]="filters().orderBy === null">Default</option>
              @for (option of orderOptions; track option.value) {
                <option [value]="option.value" [selected]="filters().orderBy === option.value">
                  {{ option.label }}
                </option>
              }
            </select>
            <button
              type="button"
              class="direction"
              [disabled]="disabled() || filters().orderBy === null"
              [attr.aria-label]="
                filters().orderDirection === 'asc' ? 'Ascending order' : 'Descending order'
              "
              [attr.aria-pressed]="filters().orderDirection === 'desc'"
              (click)="toggleDirection()"
            >
              {{ filters().orderDirection === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
        </div>
      </div>

      @if (!isDefault()) {
        <button type="button" class="clear" [disabled]="disabled()" (click)="clear()">
          Clear filters
        </button>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem 1.25rem;
      padding: 0.875rem 1rem;
      border: 1px solid var(--orange-light);
      border-radius: 0.75rem;
      background: #fff;
    }
    .selects {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    select {
      min-width: 9rem;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--field-border);
      border-radius: 0.5rem;
      background: #fff;
      font: inherit;
      font-size: 0.8125rem;
    }
    .sort {
      display: flex;
      gap: 0.25rem;
    }
    .direction,
    .clear {
      border: 1px solid var(--field-border);
      background: #fff;
      color: var(--ink);
      font: inherit;
      cursor: pointer;
      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .direction {
      width: 2rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
    .clear {
      margin-left: auto;
      padding: 0.375rem 0.875rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFilterBar {
  /** The user's labels, offered in the label filter. */
  readonly labels = input<readonly Label[]>([]);
  readonly filters = model<TaskFilters>({ ...DEFAULT_TASK_FILTERS });
  readonly disabled = input(false);

  protected readonly orderOptions = TASK_ORDER_OPTIONS;
  protected readonly labelSelectId = `task-filter-label-${nextId}`;
  protected readonly sortSelectId = `task-filter-sort-${nextId++}`;

  protected readonly isDefault = computed(() => isDefaultFilters(this.filters()));
  /** The URL names a label the user no longer has; keep it visible so it can be cleared. */
  protected readonly missingLabel = computed(() => {
    const id = this.filters().labelId;
    return id !== null && !this.labels().some((l) => l.labelId === id);
  });

  protected setPriority(priority: TaskPriority | null): void {
    this.update({ priority });
  }

  protected setLabel(value: string): void {
    this.update({ labelId: value ? Number(value) : null });
  }

  protected setOrderBy(value: string): void {
    const orderBy = (value || null) as TaskOrderBy | null;
    this.update(orderBy === null ? { orderBy, orderDirection: 'asc' } : { orderBy });
  }

  protected toggleDirection(): void {
    if (this.filters().orderBy === null) return;
    this.update({ orderDirection: this.filters().orderDirection === 'asc' ? 'desc' : 'asc' });
  }

  protected clear(): void {
    this.filters.set({ ...DEFAULT_TASK_FILTERS });
  }

  private update(changes: Partial<TaskFilters>): void {
    if (this.disabled()) return;
    this.filters.update((filters) => ({ ...filters, ...changes }));
  }
}
