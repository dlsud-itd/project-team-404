import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Task } from '../../shared/types/task.types';
import { TaskItem } from '../../task-crud/components/task-item/task-item';

/** An open task moved from one place in the list to another; `button` is set for keyboard moves. */
export interface ListMove {
  from: number;
  to: number;
  button?: 'up' | 'down';
}

/**
 * The list view: a project's tasks as cards, open ones first. Open tasks can be reordered by
 * dragging, the Move buttons or Alt+Up / Alt+Down; each move is emitted for the page to save.
 * The page also loads the tasks and shows the empty and error states it shares with the table.
 */
@Component({
  selector: 'app-list-view',
  imports: [TaskItem, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder],
  templateUrl: './list-view.html',
  styleUrl: './list-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListView {
  readonly open = input.required<readonly Task[]>();
  readonly completed = input.required<readonly Task[]>();
  readonly canReorder = input(false);
  /** Why the open tasks can't be reordered right now (filters, a sort, a long list), or null. */
  readonly reorderBlocked = input<string | null>(null);
  /** Read out by screen readers after a move. */
  readonly announcement = input('');

  readonly moved = output<ListMove>();
  readonly deleteRequested = output<Task>();

  protected dropped(event: CdkDragDrop<unknown>): void {
    this.moved.emit({ from: event.previousIndex, to: event.currentIndex });
  }

  /**
   * Alt+Up / Alt+Down while anything in a task's row has focus: the same move as its Move buttons.
   * Ignored at either end of the list and while reordering is off.
   */
  protected moveByKey(event: Event, from: number, to: number, button: 'up' | 'down'): void {
    if (!this.canReorder() || to < 0 || to >= this.open().length) return;
    event.preventDefault();
    this.moved.emit({ from, to, button });
  }
}
