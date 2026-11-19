import type { TaskRecurrence } from '../../task-scheduling/types/task-scheduling.types';

/** Body of GET /api/tasks/:taskId/streak. Dates are YYYY-MM-DD in the user's timezone. */
export interface ApiTaskStreak {
  taskId: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn: string | null;
  nextOccurrenceOn: string | null;
  timezone: string;
}

/** A repeat that can carry a streak. */
export type StreakRecurrence = Exclude<TaskRecurrence, 'none'>;

/** One period in the strip of recent periods. */
export type StreakPeriodState =
  /** Completed. */
  | 'done'
  /** Expected but not completed in time. */
  | 'missed'
  /** Due now and not completed yet. */
  | 'open'
  /** Before the earliest completion the API reports; the API sends no older history. */
  | 'unknown';

export interface StreakPeriod {
  /** YYYY-MM-DD: the day the occurrence falls on, or the first of the month for monthly repeats. */
  date: string;
  state: StreakPeriodState;
}

/**
 * Where the streak stands today:
 * - done: this period's occurrence is complete; the next is still ahead.
 * - at-risk: an occurrence is due today (this month, for monthly repeats) and still open.
 * - broken: an occurrence was missed, so the streak has ended.
 * - none: nothing has been completed yet.
 */
export type StreakStatus = 'done' | 'at-risk' | 'broken' | 'none';

/** A task's streak as the app shows it. */
export interface TaskStreak {
  taskId: number;
  recurrence: StreakRecurrence;
  /** 0 once an occurrence has been missed, even when the server still counts it. */
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn: string | null;
  /**
   * How many periods in a row were completed up to and including lastCompletedOn, at least 1 when
   * there is one. Unlike currentStreak it is kept after a miss, for the calendar strip.
   */
  runLength: number;
  /** The day the next occurrence becomes due, or null when the streak is broken or never began. */
  nextDueOn: string | null;
  status: StreakStatus;
  /** True when the streak is alive and today's occurrence is still open. */
  atRisk: boolean;
}

/** How many periods the streak detail's calendar strip shows. */
export const STREAK_STRIP_LENGTH = 14;
