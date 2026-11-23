import { Injectable, signal } from '@angular/core';

/** A button shown inside a toast, such as "Undo". */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'warning' | 'error' | 'info';
  action?: ToastAction;
}

export interface ToastOptions {
  kind?: Toast['kind'];
  action?: ToastAction;
  /** How long the toast stays up; defaults to TOAST_DURATION_MS. */
  durationMs?: number;
}

/** How long a toast stays up before it closes itself. */
export const TOAST_DURATION_MS = 6000;

/** Short-lived messages shown by ToastOutlet, such as "Couldn't save the new order". */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly list = signal<readonly Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  success(message: string): number {
    return this.show(message, { kind: 'success' });
  }

  warning(message: string): number {
    return this.show(message, { kind: 'warning' });
  }

  error(message: string): number {
    return this.show(message, { kind: 'error' });
  }

  info(message: string): number {
    return this.show(message, { kind: 'info' });
  }

  /** Shows a toast and returns its id so the caller can dismiss it early. */
  show(message: string, options: ToastOptions = {}): number {
    const id = this.nextId++;
    const toast: Toast = { id, message, kind: options.kind ?? 'info' };
    if (options.action) toast.action = options.action;
    this.list.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(id), options.durationMs ?? TOAST_DURATION_MS);
    return id;
  }

  dismiss(id: number): void {
    this.list.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Runs a toast's action once and closes the toast. */
  runAction(id: number): void {
    const toast = this.list().find((item) => item.id === id);
    this.dismiss(id);
    toast?.action?.run();
  }
}
