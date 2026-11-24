import type { TimelineWindow, TimelineZoom } from '../types/task-timeline.types';

/*
 * Date maths for the timeline. Dates stay YYYY-MM-DD strings and are worked on as UTC midnights,
 * so the browser's own timezone and clock changes never shift a day.
 */

const DAY_MS = 86_400_000;

/**
 * The narrowest a day may get, in pixels. The timeline stretches to fill its space, but never
 * below this, so a month on a phone scrolls sideways instead of squashing.
 */
export const MIN_DAY_WIDTH: Record<TimelineZoom, number> = { week: 112, month: 36 };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMs(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function toDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toDate(toMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** How many days the window shows. */
export function dayCount(window: TimelineWindow): number {
  return daysBetween(window.from, window.to) + 1;
}

/** The week (Monday to Sunday) or calendar month that holds `anchor`. */
export function windowFor(zoom: TimelineZoom, anchor: string): TimelineWindow {
  const day = new Date(toMs(anchor));
  if (zoom === 'week') {
    const sinceMonday = (day.getUTCDay() + 6) % 7;
    const from = addDays(anchor, -sinceMonday);
    return { from, to: addDays(from, 6) };
  }
  const year = day.getUTCFullYear();
  const month = day.getUTCMonth();
  return {
    from: toDate(Date.UTC(year, month, 1)),
    to: toDate(Date.UTC(year, month + 1, 0)),
  };
}

/** The window before (-1) or after (+1) this one. */
export function shiftWindow(
  zoom: TimelineZoom,
  window: TimelineWindow,
  step: number,
): TimelineWindow {
  if (zoom === 'week') return windowFor('week', addDays(window.from, step * 7));
  const from = new Date(toMs(window.from));
  return windowFor('month', toDate(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + step, 1)));
}

/** Whether `date` is inside the window. */
export function inWindow(date: string, window: TimelineWindow): boolean {
  return date >= window.from && date <= window.to;
}

export interface TimelineDay {
  date: string;
  /** "Mon" */
  weekday: string;
  dayOfMonth: number;
  /** "Dec", set on the 1st of a month, where a week crosses into the next month. */
  monthLabel: string | null;
  isWeekend: boolean;
}

/** Every day in the window, in order. */
export function daysIn(window: TimelineWindow): TimelineDay[] {
  return Array.from({ length: Math.max(dayCount(window), 0) }, (_, index) => {
    const date = addDays(window.from, index);
    const day = new Date(toMs(date));
    const dayOfMonth = day.getUTCDate();
    return {
      date,
      weekday: WEEKDAYS[day.getUTCDay()],
      dayOfMonth,
      monthLabel: dayOfMonth === 1 ? MONTHS[day.getUTCMonth()] : null,
      isWeekend: day.getUTCDay() === 0 || day.getUTCDay() === 6,
    };
  });
}

/**
 * Where `date` starts across the window, as a percentage of its width: 0 is the start of the
 * first day and 100 the end of the last.
 */
export function dateToX(date: string, window: TimelineWindow): number {
  return (daysBetween(window.from, date) / dayCount(window)) * 100;
}

/** The day under a position given as a percentage of the window's width, kept inside it. */
export function xToDate(x: number, window: TimelineWindow): string {
  const count = dayCount(window);
  const index = Math.min(Math.max(Math.floor((x / 100) * count), 0), count - 1);
  return addDays(window.from, index);
}

export interface BarGeometry {
  /** Percentages of the window's width. */
  left: number;
  width: number;
  /** The bar starts before the window, so its left end is cut off. */
  clippedStart: boolean;
  /** The bar ends after the window, so its right end is cut off. */
  clippedEnd: boolean;
}

/**
 * Where a bar sits: from the start of its first day to the end of its last, cut to the window.
 * Null when the bar is wholly outside the window.
 */
export function barGeometry(
  span: { start: string; end: string },
  window: TimelineWindow,
): BarGeometry | null {
  if (span.end < window.from || span.start > window.to) return null;
  const start = span.start < window.from ? window.from : span.start;
  const end = span.end > window.to ? window.to : span.end;
  return {
    left: dateToX(start, window),
    width: ((daysBetween(start, end) + 1) / dayCount(window)) * 100,
    clippedStart: span.start < window.from,
    clippedEnd: span.end > window.to,
  };
}

function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month: month - 1, day };
}

/** "Nov 23 – 29, 2026", "Nov 30 – Dec 6, 2026", "Dec 28, 2026 – Jan 3, 2027", "November 2026". */
export function windowLabel(zoom: TimelineZoom, window: TimelineWindow): string {
  const from = parts(window.from);
  const to = parts(window.to);
  if (zoom === 'month') return `${MONTH_NAMES[from.month]} ${from.year}`;
  if (from.year !== to.year) {
    return `${MONTHS[from.month]} ${from.day}, ${from.year} – ${MONTHS[to.month]} ${to.day}, ${to.year}`;
  }
  if (from.month !== to.month) {
    return `${MONTHS[from.month]} ${from.day} – ${MONTHS[to.month]} ${to.day}, ${to.year}`;
  }
  return `${MONTHS[from.month]} ${from.day} – ${to.day}, ${to.year}`;
}

/** "Nov 3 – Nov 7, 2026", or "Nov 3, 2026" for a one-day bar. */
export function spanLabel(start: string, end: string): string {
  const from = parts(start);
  const to = parts(end);
  const short = (p: { month: number; day: number }) => `${MONTHS[p.month]} ${p.day}`;
  if (start === end) return `${short(from)}, ${from.year}`;
  if (from.year !== to.year) return `${short(from)}, ${from.year} – ${short(to)}, ${to.year}`;
  return `${short(from)} – ${short(to)}, ${to.year}`;
}
