import { describe, expect, it } from 'vitest';
import { reorderTasks } from './reorder-tasks.util';

describe('reorderTasks', () => {
  it('assigns consecutive positions in the requested order', () => {
    expect(reorderTasks([12, 4, 9])).toEqual([
      { taskId: 12, position: 1 },
      { taskId: 4, position: 2 },
      { taskId: 9, position: 3 },
    ]);
  });

  it('returns an empty update list for no IDs', () => {
    expect(reorderTasks([])).toEqual([]);
  });
});
