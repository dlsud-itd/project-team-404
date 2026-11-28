import type { Task } from '../../../shared/types/task.types';
import type {
  ApiBoardStatus,
  ApiBoardTask,
  ApiTaskBoard,
  BoardCard,
  BoardColumnKey,
  BoardState,
} from '../types/task-board.types';

/** A task in project 10, with details that can be overridden. */
export function boardTask(taskId: number, title: string, changes: Partial<Task> = {}): Task {
  return {
    taskId,
    projectId: 10,
    priorityId: 3,
    title,
    description: null,
    scheduledDate: null,
    dueDate: null,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
    ...changes,
  };
}

/** A card in a column, with or without details. */
export function card(task: Task, isDone = false, withDetails = true): BoardCard {
  return { taskId: task.taskId, title: task.title, isDone, task: withDetails ? task : null };
}

/** A board state whose counts match the columns. */
export function boardState(columns: Partial<Record<BoardColumnKey, BoardCard[]>>): BoardState {
  const todo = columns.todo ?? [];
  const inProgress = columns.inProgress ?? [];
  const done = columns.done ?? [];
  return {
    columns: { todo, inProgress, done },
    counts: { todo: todo.length, inProgress: inProgress.length, done: done.length },
  };
}

const STATUS: Record<BoardColumnKey, ApiBoardStatus> = {
  todo: 'todo',
  inProgress: 'in_progress',
  done: 'done',
};

/** GET /api/tasks/board's reply for these tasks, column by column. */
export function apiBoard(
  columns: Partial<Record<BoardColumnKey, Task[]>>,
  counts: Partial<Record<BoardColumnKey, number>> = {},
): ApiTaskBoard {
  const toApi = (column: BoardColumnKey): ApiBoardTask[] =>
    (columns[column] ?? []).map((task, position) => ({
      id: task.taskId,
      title: task.title,
      boardStatus: STATUS[column],
      isDone: column === 'done',
      position,
      doneAt: column === 'done' ? '2026-11-19T10:00:00.000Z' : null,
    }));
  return {
    projectId: 10,
    columns: { todo: toApi('todo'), inProgress: toApi('inProgress'), done: toApi('done') },
    counts: {
      todo: counts.todo ?? columns.todo?.length ?? 0,
      inProgress: counts.inProgress ?? columns.inProgress?.length ?? 0,
      done: counts.done ?? columns.done?.length ?? 0,
    },
  };
}
