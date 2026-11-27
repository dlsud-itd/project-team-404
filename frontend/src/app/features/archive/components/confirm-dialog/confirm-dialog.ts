import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * A yes/no question for a destructive action, such as "Delete permanently". The parent shows
 * it, runs the action while `busy` is true, and closes it. Escape and the backdrop cancel.
 */
@Component({
  selector: 'app-confirm-dialog',
  host: { '(document:keydown.escape)': 'cancel()' },
  template: `
    <div class="backdrop" (click)="cancel()"></div>
    <div
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <h2 id="confirm-dialog-title">{{ title() }}</h2>
      <p id="confirm-dialog-message">{{ message() }}</p>

      @if (error(); as text) {
        <p class="error" role="alert">{{ text }}</p>
      }

      <div class="actions">
        <button #cancelButton type="button" class="cancel" [disabled]="busy()" (click)="cancel()">
          Cancel
        </button>
        <button type="button" class="confirm" [disabled]="busy()" (click)="confirm()">
          {{ busy() ? busyLabel() : confirmLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(29 23 20 / 0.45);
    }
    .dialog {
      position: relative;
      width: min(26rem, 100%);
      padding: 1.5rem;
      border-radius: 1rem;
      background: #fff;
      box-shadow: var(--elevation-2);
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
      color: var(--ink-muted);
      font-size: 0.875rem;
    }
    .error {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-left: 3px solid var(--error);
      background: #fdf0ee;
      color: var(--error);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--field-border);
      border-radius: 0.5rem;
      background: #fff;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      &:disabled {
        cursor: progress;
        opacity: 0.7;
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
    .confirm {
      border-color: var(--error);
      background: var(--error);
      color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Delete');
  readonly busyLabel = input('Deleting…');
  /** True while the action runs; blocks both buttons and Escape. */
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    // Start on the safe choice.
    afterNextRender(() => this.cancelButton().nativeElement.focus());
  }

  protected confirm(): void {
    if (!this.busy()) this.confirmed.emit();
  }

  protected cancel(): void {
    if (!this.busy()) this.cancelled.emit();
  }
}
