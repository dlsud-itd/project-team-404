export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export function getNextOccurrence(
  currentDate: Date | string,
  recurrence: TaskRecurrence,
  timeZone = 'UTC'
): Date {
  const date = new Date(currentDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid task date');
  }

  if (recurrence === 'none') {
    return new Date(date);
  }

  const normalized = new Date(date.toLocaleString('en-US', { timeZone }));

  if (recurrence === 'daily') {
    normalized.setUTCDate(normalized.getUTCDate() + 1);
    return normalized;
  }

  if (recurrence === 'weekly') {
    normalized.setUTCDate(normalized.getUTCDate() + 7);
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
  const targetDay = Math.min(
    normalized.getUTCDate(),
    monthEnd.getUTCDate()
  );
  const nextMonth = new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, targetDay, 0, 0, 0));
  return nextMonth;
}
