import type { BoardQuery } from '../validators/board-query.validator';
import type {
  BoardReorderInput,
  BoardStatus,
} from '../validators/board-reorder.validator';

export type { BoardQuery, BoardReorderInput, BoardStatus };

export type BoardTask = {
  id: number;
  title: string;
  boardStatus: BoardStatus;
  isDone: boolean;
  position: number;
  doneAt: Date | null;
};

export type TaskBoardResult = {
  /** Null for the all-projects board. */
  projectId: number | null;
  columns: {
    todo: BoardTask[];
    inProgress: BoardTask[];
    done: BoardTask[];
  };
  counts: {
    todo: number;
    inProgress: number;
    done: number;
  };
};
