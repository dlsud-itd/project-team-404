import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

/** Shows ToastService messages in the bottom corner of the screen. */
@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="toast"
          [class.error]="toast.kind === 'error'"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <span>{{ toast.message }}</span>
          <button type="button" class="close" (click)="toasts.dismiss(toast.id)">
            <span aria-hidden="true">×</span>
            <span class="visually-hidden">Dismiss</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      left: 1rem;
      z-index: 50;
      display: grid;
      justify-items: end;
      gap: 0.5rem;
      pointer-events: none;
    }
    .toast {
      display: flex;
      max-width: 24rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.75rem 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--ink);
      color: #fff;
      font-size: 0.875rem;
      box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
      pointer-events: auto;
    }
    .toast.error {
      background: var(--error);
    }
    .close {
      border: 0;
      background: none;
      color: inherit;
      font-size: 1.125rem;
      line-height: 1;
      cursor: pointer;
    }
    .close:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
