import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

/**
 * Shows ToastService messages in the bottom corner of the screen: small cards whose left stroke
 * is colored by what happened (see Toast['kind']).
 */
@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          [class]="'toast ' + toast.kind"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <span class="message">{{ toast.message }}</span>
          @if (toast.action; as action) {
            <button type="button" class="action" (click)="toasts.runAction(toast.id)">
              {{ action.label }}
            </button>
          }
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
      --toast-accent: var(--ink-muted);

      display: flex;
      max-width: min(20rem, 100%);
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.375rem 0.5rem 0.75rem;
      border: 1px solid var(--divider);
      border-left: 4px solid var(--toast-accent);
      border-radius: 0.5rem;
      background: var(--theme-surface);
      color: var(--ink);
      font-size: 0.8125rem;
      line-height: 1.35;
      box-shadow: var(--elevation-2);
      pointer-events: auto;
      animation: toast-in 150ms ease-out;
    }
    .toast.success {
      --toast-accent: var(--theme-success);
    }
    .toast.info {
      --toast-accent: var(--theme-info);
    }
    .toast.warning {
      --toast-accent: var(--theme-warning);
    }
    .toast.error,
    .toast.danger {
      --toast-accent: var(--theme-error);
    }
    .message {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .action {
      flex: none;
      padding: 0.125rem 0.5rem;
      border: 1px solid var(--divider);
      border-radius: 0.375rem;
      background: none;
      color: var(--ink);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      &:hover {
        background: var(--hover-bg);
      }
    }
    .close {
      display: grid;
      flex: none;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: var(--ink-muted);
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      &:hover {
        background: var(--hover-bg);
        color: var(--ink);
      }
    }
    .action:focus-visible,
    .close:focus-visible {
      outline: 2px solid var(--theme-primary);
      outline-offset: 2px;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
