import type { Task } from '../../../shared/types/task.types';
import type {
  ApiBoardStatus,
  ApiTaskBoard,
  BoardCard,
  BoardColumnKey,
  BoardState,
} from '../types/task-board.types';

/** The columns in board order. */
export const BOARD_COLUMNS: readonly BoardColumnKey[] = ['todo', 'inProgress', 'done'];

export const BOARD_COLUMN_NAMES: Readonly<Record<BoardColumnKey, string>> = {
  todo: 'To Do',
  inProgress: 'In Progress',
  done: 'Done',
};

export function toApiStatus(column: BoardColumnKey): ApiBoardStatus {
  return column === 'inProgress' ? 'in_progress' : column;
}

/** The board from the API, with each card's details looked up by id. */
export function toBoardState(board: ApiTaskBoard, details: readonly Task[]): BoardState {
  const byId = new Map(details.map((task) => [task.taskId, task]));
  const cards = (column: BoardColumnKey): BoardCard[] =>
    board.columns[column].map((task) => ({
      taskId: task.id,
      title: task.title,
      isDone: task.isDone,
      task: byId.get(task.id) ?? null,
    }));
  return {
    columns: { todo: cards('todo'), inProgress: cards('inProgress'), done: cards('done') },
    counts: { ...board.counts },
  };
}

/** Which column a card is in and where, or null when it is not on the board. */
export function findCard(
  state: BoardState,
  taskId: number,
): { column: BoardColumnKey; index: number } | null {
  for (const column of BOARD_COLUMNS) {
    const index = state.columns[column].findIndex((card) => card.taskId === taskId);
    if (index >= 0) return { column, index };
  }
  return null;
}

/**
 * The board with a card moved to `index` in column `to` (clamped to the column's length), or
 * null when the card is missing or would stay where it is. Counts follow a change of column.
 */
export function moveCard(
  state: BoardState,
  taskId: number,
  to: BoardColumnKey,
  index: number,
): BoardState | null {
  const from = findCard(state, taskId);
  if (!from) return null;
  const sameColumn = from.column === to;
  const source = state.columns[from.column].filter((card) => card.taskId !== taskId);
  const target = sameColumn ? source : [...state.columns[to]];
  const at = Math.max(0, Math.min(index, target.length));
  if (sameColumn && at === from.index) return null;

  const card = state.columns[from.column][from.index];
  target.splice(at, 0, { ...card, isDone: to === 'done' });
  const columns = { ...state.columns, [from.column]: source, [to]: target };
  const counts = sameColumn
    ? state.counts
    : {
        ...state.counts,
        [from.column]: Math.max(0, state.counts[from.column] - 1),
        [to]: state.counts[to] + 1,
      };
  return { columns, counts };
}

/**
 * The order to save for a column the user only saw part of (filters were on). The server
 * needs the whole column, so the moved task goes right after the nearest card the user saw
 * above it, or right before the nearest one below it, or first when none of them are left.
 *
 * @param fullIds the column as the unfiltered board has it now
 * @param visibleIds the filtered column after the move, including movedId
 */
export function fullColumnOrder(
  fullIds: readonly number[],
  visibleIds: readonly number[],
  movedId: number,
): number[] {
  const order = fullIds.filter((id) => id !== movedId);
  const at = visibleIds.indexOf(movedId);
  for (let i = at - 1; i >= 0; i--) {
    const position = order.indexOf(visibleIds[i]);
    if (position >= 0) {
      order.splice(position + 1, 0, movedId);
      return order;
    }
  }
  for (let i = at + 1; i < visibleIds.length; i++) {
    const position = order.indexOf(visibleIds[i]);
    if (position >= 0) {
      order.splice(position, 0, movedId);
      return order;
    }
  }
  return [movedId, ...order];
}

/** What a screen reader says after a move, e.g. "“Outline” moved to Done, position 1 of 4." */
export function moveAnnouncement(state: BoardState, taskId: number, title: string): string {
  const place = findCard(state, taskId);
  if (!place) return '';
  const length = state.columns[place.column].length;
  return `“${title}” moved to ${BOARD_COLUMN_NAMES[place.column]}, position ${place.index + 1} of ${length}.`;
}
