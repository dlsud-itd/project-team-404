import type { TimelineZoom } from '../types/task-timeline.types';

/*
 * The day widths a viewer has dragged the timeline to. They are a per-browser convenience,
 * so they live in localStorage, and the timeline works the same when storage is unavailable.
 */

export const TIMELINE_LAYOUT_KEY = 'habitflow-timeline-layout';

export interface WidthLimits {
  min: number;
  max: number;
}

/** One day's column, in pixels, at each zoom. */
export const DAY_WIDTH_LIMITS: Record<TimelineZoom, WidthLimits> = {
  week: { min: 48, max: 320 },
  month: { min: 20, max: 120 },
};

/** How far one arrow-key press moves a handle, in pixels. */
export const RESIZE_STEP: Record<TimelineZoom, number> = { week: 16, month: 4 };

/** Null means the default: days that stretch to fit the screen. */
export interface TimelineLayout {
  dayWidth: Record<TimelineZoom, number | null>;
}

export const DEFAULT_TIMELINE_LAYOUT: TimelineLayout = {
  dayWidth: { week: null, month: null },
};

/** The value kept inside the limits, in whole pixels. */
export function clampWidth(value: number, limits: WidthLimits): number {
  return Math.round(Math.min(Math.max(value, limits.min), limits.max));
}

/**
 * Every day's width after dragging the right edge of day `boundaryIndex` (0 for the first day)
 * by `dx` pixels. All the days to its left grow together, so that edge stays under the pointer.
 */
export function dayWidthForDrag(
  startWidth: number,
  dx: number,
  boundaryIndex: number,
  limits: WidthLimits,
): number {
  return clampWidth(startWidth + dx / (boundaryIndex + 1), limits);
}

/** A saved width, or null when it is missing or not a sensible number. */
function savedWidth(value: unknown, limits: WidthLimits): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? clampWidth(value, limits) : null;
}

export function readTimelineLayout(): TimelineLayout {
  try {
    const raw = localStorage.getItem(TIMELINE_LAYOUT_KEY);
    if (!raw) return DEFAULT_TIMELINE_LAYOUT;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return DEFAULT_TIMELINE_LAYOUT;
    // Older saves also held a task-name column width; that column is gone, so it is ignored.
    const { dayWidth } = saved as Partial<Record<keyof TimelineLayout, unknown>>;
    const days = (dayWidth && typeof dayWidth === 'object' ? dayWidth : {}) as Record<
      string,
      unknown
    >;
    return {
      dayWidth: {
        week: savedWidth(days['week'], DAY_WIDTH_LIMITS.week),
        month: savedWidth(days['month'], DAY_WIDTH_LIMITS.month),
      },
    };
  } catch {
    // Storage is blocked or the value is not JSON; the defaults still work.
    return DEFAULT_TIMELINE_LAYOUT;
  }
}

export function saveTimelineLayout(layout: TimelineLayout): void {
  try {
    localStorage.setItem(TIMELINE_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Storage may be unavailable; the widths still apply until the page is left.
  }
}
