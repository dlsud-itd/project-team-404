import { describe, expect, it } from 'vitest';
import { reorderTasksValidator } from './reorder-tasks.validator';

describe('reorderTasksValidator', () => {
  it('accepts a project and ordered task IDs', () => {
    expect(
      reorderTasksValidator.parse({ projectId: 7, taskIds: [4, 9, 12] })
    ).toEqual({ projectId: 7, taskIds: [4, 9, 12] });
  });

  it('rejects empty, oversized, duplicate, or invalid task IDs', () => {
    expect(
      reorderTasksValidator.safeParse({ projectId: 7, taskIds: [] }).success
    ).toBe(false);
    expect(
      reorderTasksValidator.safeParse({
        projectId: 7,
        taskIds: Array.from({ length: 501 }, (_, index) => index + 1),
      }).success
    ).toBe(false);
    expect(
      reorderTasksValidator.safeParse({ projectId: 7, taskIds: [4, 4] }).success
    ).toBe(false);
    expect(
      reorderTasksValidator.safeParse({ projectId: 7, taskIds: [0] }).success
    ).toBe(false);
    expect(
      reorderTasksValidator.safeParse({ projectId: 0, taskIds: [4] }).success
    ).toBe(false);
  });
});
