export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export function getNextOccurrence(
  currentDate: Date | string,
  recurrence: TaskRecurrence,
  timeZone = 'UTC',
  /** For weekly repeats: weekdays to fall on, 0 = Sunday … 6 = Saturday. Empty means every 7 days. */
  weekdays: readonly number[] = []
): Date {
  const date = new Date(currentDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid task date');
  }

  if (recurrence === 'none') {
    return new Date(date);
  }

  // The task's calendar day in the user's zone, as UTC midnight, whatever zone the server runs in.
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const normalized = new Date(`${localDay}T00:00:00.000Z`);

  if (recurrence === 'daily') {
    normalized.setUTCDate(normalized.getUTCDate() + 1);
    return normalized;
  }

  if (recurrence === 'weekly') {
    // The first chosen weekday after this one; with one day chosen, that is a week later.
    for (let step = 1; step < 7; step++) {
      normalized.setUTCDate(normalized.getUTCDate() + 1);
      if (weekdays.includes(normalized.getUTCDay())) return normalized;
    }
    normalized.setUTCDate(normalized.getUTCDate() + 1);
    return normalized;
  }

  const monthEnd = new Date(
    Date.UTC(
      normalized.getUTCFullYear(),
      normalized.getUTCMonth() + 2,
      0,
      0,
      0,
      0
    )
  );
  const targetDay = Math.min(normalized.getUTCDate(), monthEnd.getUTCDate());
  const nextMonth = new Date(
    Date.UTC(
      normalized.getUTCFullYear(),
      normalized.getUTCMonth() + 1,
      targetDay,
      0,
      0,
      0
    )
  );
  return nextMonth;
}
