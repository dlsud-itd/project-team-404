import type { Task } from '../../../shared/types/task.types';
import type { TaskListFilter } from '../../../task-crud/services/task.service';

/** A board column, as GET /api/tasks/board names it in `columns` and `counts`. */
export type BoardColumnKey = 'todo' | 'inProgress' | 'done';

/** A board column, as a task's `boardStatus` and PUT /api/tasks/board/reorder name it. */
export type ApiBoardStatus = 'todo' | 'in_progress' | 'done';

/** A task as GET /api/tasks/board sends it. */
export interface ApiBoardTask {
  id: number;
  title: string;
  boardStatus: ApiBoardStatus;
  isDone: boolean;
  position: number;
  doneAt: string | null;
}

/** Body of GET /api/tasks/board. */
export interface ApiTaskBoard {
  projectId: number;
  columns: Record<BoardColumnKey, ApiBoardTask[]>;
  /** Every matching task per column; Done may hold more than the 50 it returns. */
  counts: Record<BoardColumnKey, number>;
}

/** Body of PUT /api/tasks/board/reorder: the target column's full order after a move. */
export interface BoardReorderBody {
  projectId: number;
  boardStatus: ApiBoardStatus;
  tasks: number[];
}

/**
 * The Sprint 5 filters the board accepts. The board keeps its own order, so the list's sort
 * and paging are left out (the server refuses them).
 */
export type BoardFilter = Omit<TaskListFilter, 'projectId' | 'page' | 'orderBy' | 'orderDirection'>;

/** One card on the board. */
export interface BoardCard {
  taskId: number;
  title: string;
  isDone: boolean;
  /** The task's full details from /api/tasks, or null when they could not be loaded. */
  task: Task | null;
}

/** The board as the page shows it. */
export interface BoardState {
  columns: Record<BoardColumnKey, BoardCard[]>;
  counts: Record<BoardColumnKey, number>;
}

/** Where a card should go: a column and a position in it. */
export interface BoardMove {
  taskId: number;
  to: BoardColumnKey;
  index: number;
  /** Made with the card's Move menu, so keyboard focus should follow the card. */
  fromMenu?: boolean;
}
