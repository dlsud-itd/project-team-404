import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Label } from '../../types/label.types';

/** A label's name in a pill, with its color as a dot and an optional remove button. */
@Component({
  selector: 'app-label-chip',
  template: `
    <span class="chip" [style.border-color]="label().color ?? null">
      <span
        class="dot"
        [class.none]="!label().color"
        [style.background]="label().color ?? null"
        aria-hidden="true"
      ></span>
      <span class="name">{{ label().name }}</span>
      @if (removable()) {
        <button
          type="button"
          class="remove"
          [disabled]="disabled()"
          [attr.aria-label]="'Remove label ' + label().name"
          (click)="removed.emit(label())"
        >
          ×
        </button>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      max-width: 100%;
      padding: 0.125rem 0.625rem;
      border: 1px solid #e6dcd7;
      border-radius: 999px;
      background: #fff;
      font-size: 0.75rem;
      line-height: 1.4;
    }
    .dot {
      flex-shrink: 0;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    .dot.none {
      border: 1px solid var(--ink-muted);
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .remove {
      margin: 0 -0.25rem 0 0;
      padding: 0 0.25rem;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--ink-muted);
      font: inherit;
      font-size: 0.875rem;
      line-height: 1;
      cursor: pointer;
      &:hover {
        color: var(--error);
      }
      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 1px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelChip {
  /** Any label-shaped value works, including a task's TaskLabel. */
  readonly label = input.required<Label>();
  readonly removable = input(false);
  readonly disabled = input(false);

  readonly removed = output<Label>();
}
