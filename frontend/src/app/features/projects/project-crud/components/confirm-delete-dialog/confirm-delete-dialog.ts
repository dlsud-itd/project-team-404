import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { Project } from '../../../shared/types/project.types';

/** Asks before deleting a project. The parent shows it, runs the delete and closes it. */
@Component({
  selector: 'app-confirm-delete-dialog',
  host: { '(document:keydown.escape)': 'cancel()' },
  template: `
    <div class="backdrop" (click)="cancel()"></div>
    <div
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
    >
      <h2 id="delete-title">Delete “{{ project().name }}”?</h2>
      <p id="delete-description">Its tasks will be moved to your Inbox.</p>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <button #cancelButton type="button" class="cancel" [disabled]="busy()" (click)="cancel()">
          Cancel
        </button>
        <button type="button" class="confirm" [disabled]="busy()" (click)="confirm()">
          {{ busy() ? 'Deleting…' : 'Delete project' }}
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
      box-shadow: 0 20px 48px rgb(0 0 0 / 0.2);
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
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--field-border);
      border-radius: 999px;
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
        outline: 2px solid #7b23a8;
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
export class ConfirmDeleteDialog {
  readonly project = input.required<Project>();
  /** True while the delete request runs; blocks both buttons and Escape. */
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
