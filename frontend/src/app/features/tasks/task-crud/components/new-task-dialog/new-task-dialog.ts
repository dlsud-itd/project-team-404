import { CdkTrapFocus } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type OnDestroy,
  afterNextRender,
  inject,
  output,
} from '@angular/core';
import { TasksStore } from '../../../shared/state/tasks.store';
import type { Task } from '../../../shared/types/task.types';
import { TaskForm } from '../../task-form/task-form';

/**
 * The new-task form as a popup, shown while TasksStore.creating is set. Clicking outside does
 * nothing, so a stray click can't lose what was typed; Cancel and Escape close it.
 */
@Component({
  selector: 'app-new-task-dialog',
  imports: [CdkTrapFocus, TaskForm],
  template: `
    <div class="backdrop"></div>
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-title"
      cdkTrapFocus
    >
      <app-task-form (closed)="close()" (created)="close(); created.emit($event)" />
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
      box-sizing: border-box;
      width: min(36rem, 100%);
      max-height: calc(100dvh - 2rem);
      padding: 1.5rem;
      overflow-y: auto;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 20px 48px rgb(0 0 0 / 0.2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTaskDialog implements OnDestroy {
  /** The task was saved. The popup has already closed. */
  readonly created = output<Task>();

  private readonly store = inject(TasksStore);
  /** What had focus when the popup opened, so closing can hand it back. */
  private readonly opener = inject(DOCUMENT).activeElement as HTMLElement | null;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => host.querySelector<HTMLElement>('#task-title')?.focus());
  }

  ngOnDestroy(): void {
    this.close();
    this.opener?.focus();
  }

  protected close(): void {
    this.store.creating.set(null);
  }
}
