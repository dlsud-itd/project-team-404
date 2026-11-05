import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { TaskPriority } from '../../types/task-organization.types';
import { NO_PRIORITY_COLORS, PRIORITY_OPTIONS } from '../../utils/priority.util';

let nextId = 0;

/**
 * Picks one priority, most urgent first, as a row of colored radio pills. The choice is a
 * two-way `value` binding; with `allowNone` there is also a first pill for null (e.g. "Any").
 */
@Component({
  selector: 'app-priority-picker',
  template: `
    <fieldset class="picker" [disabled]="disabled()">
      <legend [class.visually-hidden]="hideLegend()">{{ legend() }}</legend>
      <div class="options">
        @if (allowNone()) {
          <label
            class="option"
            [style.--text]="none.text"
            [style.--background]="none.background"
            [style.--border]="none.border"
          >
            <input
              type="radio"
              [name]="name"
              value=""
              data-priority=""
              [checked]="value() === null"
              (change)="choose(null)"
            />
            <span class="pill">{{ noneLabel() }}</span>
          </label>
        }
        @for (option of options; track option.value) {
          <label
            class="option"
            [style.--text]="option.colors.text"
            [style.--background]="option.colors.background"
            [style.--border]="option.colors.border"
          >
            <input
              type="radio"
              [name]="name"
              [value]="option.value"
              [attr.data-priority]="option.value"
              [checked]="value() === option.value"
              (change)="choose(option.value)"
            />
            <span class="pill">{{ option.label }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
    }
    .picker {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: 0.375rem;
      padding: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .option {
      position: relative;
      cursor: pointer;
      input {
        position: absolute;
        opacity: 0;
      }
    }
    .pill {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    input:checked + .pill {
      background: var(--background);
      box-shadow: inset 0 0 0 1px var(--border);
    }
    input:focus-visible + .pill {
      outline: 2px solid #7b23a8;
      outline-offset: 2px;
    }
    .picker:disabled .option {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityPicker {
  /** The chosen priority; null means none (only choosable with `allowNone`). */
  readonly value = model<TaskPriority | null>(null);
  readonly allowNone = input(false);
  readonly noneLabel = input('Any');
  readonly legend = input('Priority');
  /** Keeps the legend for screen readers but hides it on screen. */
  readonly hideLegend = input(false);
  readonly disabled = input(false);

  protected readonly options = PRIORITY_OPTIONS;
  protected readonly none = NO_PRIORITY_COLORS;
  protected readonly name = `priority-picker-${nextId++}`;

  protected choose(priority: TaskPriority | null): void {
    if (!this.disabled() && priority !== this.value()) this.value.set(priority);
  }
}
