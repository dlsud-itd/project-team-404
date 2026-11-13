import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'error' | 'info';
}

/** How long a toast stays up before it closes itself. */
export const TOAST_DURATION_MS = 6000;

/** Short-lived messages shown by ToastOutlet, such as "Couldn't save the new order". */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly list = signal<readonly Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: number): void {
    this.list.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(message: string, kind: Toast['kind']): void {
    const id = this.nextId++;
    this.list.update((toasts) => [...toasts, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
