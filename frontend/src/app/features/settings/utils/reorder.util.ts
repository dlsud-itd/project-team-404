import { moveItemInArray } from '@angular/cdk/drag-drop';

/** A copy of `items` with the item at `from` moved to `to`, or null when nothing moves. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] | null {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return null;
  }
  const next = [...items];
  moveItemInArray(next, from, to);
  return next;
}

/**
 * Which move button keeps focus after a keyboard move: the one pressed, or its partner once the
 * row reaches the end of the list and the pressed one is disabled.
 */
export function moveFocusTarget(newIndex: number, length: number, delta: -1 | 1): 'up' | 'down' {
  if (delta < 0) return newIndex === 0 ? 'down' : 'up';
  return newIndex === length - 1 ? 'up' : 'down';
}

/** "3 tasks", "1 task", or null when the count is not known. */
export function taskCountLabel(count: number | null): string | null {
  if (count === null) return null;
  return `${count} ${count === 1 ? 'task' : 'tasks'}`;
}
