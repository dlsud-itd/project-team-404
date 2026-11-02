/** "2026-10-02" → "Oct 2", with the year added when it is not the current year. */
export function formatDate(date: string, today: Date = new Date()): string {
  const [year, month, day] = date.split('-').map(Number);
  // Built from parts so the date stays local; new Date('YYYY-MM-DD') would be read as UTC.
  const local = new Date(year, month - 1, day);
  return local.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** The user's timezone, or the browser's when theirs is missing or not a real timezone. */
export function userTimeZone(timeZone?: string | null): string {
  if (timeZone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
      return timeZone;
    } catch {
      // Falls through to the browser's timezone.
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** What a wall clock in the timezone shows at this instant, as the matching UTC timestamp. */
function wallClock(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
}

/** How far the timezone is ahead of UTC at this instant, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const wholeSeconds = Math.floor(instant / 1000) * 1000;
  return wallClock(wholeSeconds, timeZone) - wholeSeconds;
}

/**
 * "2026-11-05" → the instant that day ends in the timezone. A deadline is a date to the user but
 * a timestamp to the API, so a task stays on time through the whole of the chosen day.
 */
export function deadlineToInstant(date: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const endOfDay = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  // Measured twice because the first guess can land on the other side of a clock change.
  const guess = endOfDay - offsetAt(endOfDay, timeZone);
  return new Date(endOfDay - offsetAt(guess, timeZone)).toISOString();
}

/** An API timestamp → its YYYY-MM-DD calendar date in the timezone. */
export function instantToDate(instant: string, timeZone: string): string {
  return new Date(wallClock(Date.parse(instant), timeZone)).toISOString().slice(0, 10);
}
