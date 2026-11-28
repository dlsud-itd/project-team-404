import type { Task } from '../../shared/types/task.types';
import type { TaskRecurrence } from '../../task-scheduling/types/task-scheduling.types';
import type { ApiTaskStreak } from '../types/task-streak.types';

/** Noon on Nov 19, 2026 in Manila (UTC+8); still the evening of Nov 18 in Los Angeles. */
export const STREAK_NOW = new Date('2026-11-19T04:00:00.000Z');
export const STREAK_TODAY = '2026-11-19';
export const STREAK_TIMEZONE = 'Asia/Manila';

export function recurringTask(
  taskId: number,
  overrides: Partial<Task> & { recurrence?: TaskRecurrence } = {},
): Task {
  const recurrence = overrides.recurrence ?? 'daily';
  return {
    taskId,
    projectId: 10,
    priorityId: 2,
    title: 'Morning review',
    description: null,
    scheduledDate: STREAK_TODAY,
    dueDate: STREAK_TODAY,
    recurrence,
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: recurrence !== 'none',
    isArchived: false,
    labels: [],
    ...overrides,
  };
}

export function apiStreak(taskId: number, overrides: Partial<ApiTaskStreak> = {}): ApiTaskStreak {
  return {
    taskId,
    currentStreak: 4,
    longestStreak: 7,
    lastCompletedOn: '2026-11-18',
    nextOccurrenceOn: STREAK_TODAY,
    timezone: STREAK_TIMEZONE,
    ...overrides,
  };
}
