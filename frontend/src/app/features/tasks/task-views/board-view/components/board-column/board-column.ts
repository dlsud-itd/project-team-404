import { CdkDrag, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type {
  BoardCard as BoardCardModel,
  BoardColumnKey,
  BoardMove,
} from '../../types/task-board.types';
import { BOARD_COLUMN_NAMES } from '../../utils/board-move.util';
import { BoardCard } from '../board-card/board-card';

/** Long-press before a touch drag starts, so a swipe still scrolls the board. */
const DRAG_START_DELAY = { touch: 250, mouse: 0 };

/**
 * One board column. Its drop list joins the board's cdkDropListGroup, so cards can be dragged
 * between columns. Done can be collapsed; it then keeps a slim drop zone.
 */
@Component({
  selector: 'app-board-column',
  imports: [CdkDropList, CdkDrag, BoardCard],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardColumn {
  readonly key = input.required<BoardColumnKey>();
  readonly cards = input.required<readonly BoardCardModel[]>();
  /** Every matching task in the column; Done can hold more than it shows. */
  readonly count = input.required<number>();
  readonly projectId = input.required<number>();
  readonly collapsible = input(false);
  readonly collapsed = input(false);
  /** True while a move is saving; dragging and the Move menus wait for it. */
  readonly busy = input(false);

  readonly moved = output<BoardMove>();
  readonly toggled = output<void>();
  /** A card's menu asked to archive it. */
  readonly archived = output<BoardCardModel>();

  protected readonly dragDelay = DRAG_START_DELAY;
  protected readonly name = computed(() => BOARD_COLUMN_NAMES[this.key()]);
  protected readonly headingId = computed(() => `board-column-${this.key()}`);
  protected readonly listId = computed(() => `board-column-${this.key()}-list`);
  /** Done only returns the most recent tasks. */
  protected readonly truncated = computed(() => this.count() > this.cards().length);

  protected drop(event: CdkDragDrop<BoardColumnKey, BoardColumnKey, number>): void {
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }
    this.moved.emit({ taskId: event.item.data, to: this.key(), index: event.currentIndex });
  }

  protected moveTo(card: BoardCardModel, to: BoardColumnKey): void {
    // A card sent to another column with the menu goes to the top, where it is easy to find.
    this.moved.emit({ taskId: card.taskId, to, index: 0, fromMenu: true });
  }

  protected moveBy(card: BoardCardModel, index: number, delta: -1 | 1): void {
    this.moved.emit({ taskId: card.taskId, to: this.key(), index: index + delta, fromMenu: true });
  }
}
