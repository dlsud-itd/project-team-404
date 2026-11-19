import { describe, expect, it } from 'vitest';
import { boardReorderValidator } from './board-reorder.validator';

describe('boardReorderValidator', () => {
  it('accepts a complete ordered target column', () => {
    expect(
      boardReorderValidator.parse({
        projectId: 4,
        boardStatus: 'in_progress',
        tasks: [11, 12],
      })
    ).toEqual({
      projectId: 4,
      boardStatus: 'in_progress',
      tasks: [11, 12],
    });
  });

  it('rejects invalid statuses, IDs, empty columns, and duplicate IDs', () => {
    for (const request of [
      { projectId: 4, boardStatus: 'blocked', tasks: [11] },
      { projectId: 4, boardStatus: 'todo', tasks: [0] },
      { projectId: 4, boardStatus: 'todo', tasks: [] },
      { projectId: 4, boardStatus: 'todo', tasks: [11, 11] },
    ]) {
      expect(boardReorderValidator.safeParse(request).success).toBe(false);
    }
  });
});
