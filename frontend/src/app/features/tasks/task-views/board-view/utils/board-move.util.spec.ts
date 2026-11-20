import { apiBoard, boardState, boardTask, card } from '../testing/board-fixtures';
import {
  findCard,
  fullColumnOrder,
  moveAnnouncement,
  moveCard,
  toApiStatus,
  toBoardState,
} from './board-move.util';

const A = boardTask(1, 'Outline');
const B = boardTask(2, 'Draft');
const C = boardTask(3, 'Review');
const D = boardTask(4, 'Submit');

const ids = (cards: { taskId: number }[]) => cards.map((c) => c.taskId);

describe('board-move.util', () => {
  describe('toApiStatus', () => {
    it('names In Progress the way the API does', () => {
      expect(toApiStatus('todo')).toBe('todo');
      expect(toApiStatus('inProgress')).toBe('in_progress');
      expect(toApiStatus('done')).toBe('done');
    });
  });

  describe('toBoardState', () => {
    it('keeps the board order and attaches each task’s details', () => {
      const state = toBoardState(apiBoard({ todo: [B, A], done: [C] }, { done: 70 }), [A, C]);

      expect(ids(state.columns.todo)).toEqual([2, 1]);
      expect(state.columns.todo[0].task).toBeNull();
      expect(state.columns.todo[1].task).toEqual(A);
      expect(state.columns.done[0]).toEqual({ taskId: 3, title: 'Review', isDone: true, task: C });
      expect(state.counts).toEqual({ todo: 2, inProgress: 0, done: 70 });
    });
  });

  describe('findCard', () => {
    it('finds the column and index, or null', () => {
      const state = boardState({ todo: [card(A)], inProgress: [card(B), card(C)] });
      expect(findCard(state, 3)).toEqual({ column: 'inProgress', index: 1 });
      expect(findCard(state, 99)).toBeNull();
    });
  });

  describe('moveCard', () => {
    const state = boardState({
      todo: [card(A), card(B), card(C)],
      inProgress: [card(D)],
    });

    it('reorders within a column without changing counts', () => {
      const next = moveCard(state, 1, 'todo', 2)!;
      expect(ids(next.columns.todo)).toEqual([2, 3, 1]);
      expect(next.counts).toBe(state.counts);
    });

    it('moves across columns, updating counts and done state', () => {
      const next = moveCard(state, 2, 'done', 0)!;
      expect(ids(next.columns.todo)).toEqual([1, 3]);
      expect(next.columns.done).toEqual([{ ...card(B), isDone: true }]);
      expect(next.counts).toEqual({ todo: 2, inProgress: 1, done: 1 });
    });

    it('inserts at the drop index in the target column', () => {
      const next = moveCard(state, 3, 'inProgress', 0)!;
      expect(ids(next.columns.inProgress)).toEqual([3, 4]);
    });

    it('clamps an index past the end', () => {
      const next = moveCard(state, 1, 'inProgress', 10)!;
      expect(ids(next.columns.inProgress)).toEqual([4, 1]);
    });

    it('returns null when nothing would change or the card is missing', () => {
      expect(moveCard(state, 2, 'todo', 1)).toBeNull();
      expect(moveCard(state, 99, 'done', 0)).toBeNull();
    });

    it('does not change the original state', () => {
      moveCard(state, 1, 'done', 0);
      expect(ids(state.columns.todo)).toEqual([1, 2, 3]);
    });
  });

  describe('fullColumnOrder', () => {
    it('puts the card after the nearest visible card above it', () => {
      // Full column 1,5,2,6; the user sees 1,2 and drops 9 between them.
      expect(fullColumnOrder([1, 5, 2, 6], [1, 9, 2], 9)).toEqual([1, 9, 5, 2, 6]);
    });

    it('puts the card before the nearest visible card below it when it lands first', () => {
      expect(fullColumnOrder([5, 1, 2], [9, 1, 2], 9)).toEqual([5, 9, 1, 2]);
    });

    it('moves a card within the column it is already in', () => {
      // Full 1,5,2,6,3; visible 1,2,3; 1 dragged below 3.
      expect(fullColumnOrder([1, 5, 2, 6, 3], [2, 3, 1], 1)).toEqual([5, 2, 6, 3, 1]);
    });

    it('skips visible neighbours the full column no longer has', () => {
      expect(fullColumnOrder([5, 2], [7, 9, 2], 9)).toEqual([5, 9, 2]);
    });

    it('puts the card first when it is the only visible card', () => {
      expect(fullColumnOrder([5, 6], [9], 9)).toEqual([9, 5, 6]);
    });
  });

  describe('moveAnnouncement', () => {
    it('names the column and position', () => {
      const state = boardState({ done: [card(A), card(B)] });
      expect(moveAnnouncement(state, 2, 'Draft')).toBe('“Draft” moved to Done, position 2 of 2.');
      expect(moveAnnouncement(state, 99, 'Gone')).toBe('');
    });
  });
});
