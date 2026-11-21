/**
 * A repeating task's occurrence can only be completed on or after its own day; the API answers
 * 409 `task-not-due` otherwise. These helpers let lists disable the checkbox up front.
 */

/** The day a not-yet-due occurrence can be completed, or null when it can be completed now. */
export function occurrenceAvailableOn(
  task: { isRecurring?: boolean; done: boolean; occurrence: string | null },
  today: string,
): string | null {
  if (!task.isRecurring || task.done || !task.occurrence) return null;
  return task.occurrence > today ? task.occurrence : null;
}

/** "2026-11-22" → "Available on Nov 22". */
export function availableOnLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Available on ${label}`;
}
