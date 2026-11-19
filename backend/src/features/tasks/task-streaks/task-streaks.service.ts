import { prisma } from '../../../shared/db/prisma.client';
import {
  addDays,
  localDateString,
  longestConsecutiveDates,
} from './streak.util';

export class TaskStreaksService {
  async getTaskStreak(taskId: number, userId: string) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
        archivedAt: null,
        OR: [
          { projectId: null },
          { project: { is: { isArchived: false, deletedAt: null } } },
        ],
      },
      include: { completionEvents: true },
    });
    if (!task) return null;

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = owner?.timezone ?? 'UTC';
    const today = localDateString(timezone);

    const events =
      task.recurrenceSeriesId !== null
        ? await prisma.taskCompletionEvent.findMany({
            where: { userId, seriesId: task.recurrenceSeriesId },
          })
        : task.completionEvents;
    const dates = events
      .map((event) => event.completedOn.toISOString().slice(0, 10))
      .filter((date, index, all) => all.indexOf(date) === index)
      .sort();

    const recurring = task.recurrence !== null && task.recurrence !== 'none';
    if (!recurring) {
      if (dates.length === 0) {
        return {
          taskId,
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedOn: null,
          nextOccurrenceOn: null,
          timezone,
        };
      }
      return {
        taskId,
        currentStreak: task.isDone ? 1 : 0,
        longestStreak: 1,
        lastCompletedOn: dates.at(-1)!,
        nextOccurrenceOn: null,
        timezone,
      };
    }

    const recurrence = task.recurrence as 'daily' | 'weekly' | 'monthly';
    const longestStreak = longestConsecutiveDates(dates, recurrence);
    const lastCompletedOn = dates.at(-1) ?? null;
    let currentStreak = 0;
    if (dates.length > 0) {
      let streak = 1;
      for (let index = dates.length - 1; index > 0; index--) {
        const current = dates[index]!;
        const previous = dates[index - 1]!;
        const consecutive =
          recurrence === 'weekly'
            ? diffDays(previous, current) === 7
            : recurrence === 'monthly'
              ? diffMonths(previous, current) === 1
              : diffDays(previous, current) === 1;
        if (!consecutive) break;
        streak++;
      }
      const missed =
        recurrence === 'daily' &&
        lastCompletedOn !== today &&
        lastCompletedOn !== addDays(today, -1);
      currentStreak = missed ? 0 : streak;
    }

    const nextOccurrenceOn =
      lastCompletedOn === null
        ? null
        : recurringNextDate(lastCompletedOn, recurrence);

    return {
      taskId,
      currentStreak,
      longestStreak,
      lastCompletedOn,
      nextOccurrenceOn:
        nextOccurrenceOn && nextOccurrenceOn >= today ? nextOccurrenceOn : null,
      timezone,
    };
  }

  async listDashboardStreaks(userId: string, limit: number) {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = owner?.timezone ?? 'UTC';
    const today = localDateString(timezone);
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        archivedAt: null,
        recurrence: { not: 'none' },
        recurrenceSeriesId: { not: null },
        OR: [
          { projectId: null },
          { project: { is: { isArchived: false, deletedAt: null } } },
        ],
      },
      orderBy: { id: 'asc' },
    });

    const series = new Map<string, (typeof tasks)[number]>();
    for (const task of tasks) {
      if (task.recurrenceSeriesId && !series.has(task.recurrenceSeriesId)) {
        series.set(task.recurrenceSeriesId, task);
      }
    }

    const result = [];
    for (const [seriesId, task] of series) {
      const events = await prisma.taskCompletionEvent.findMany({
        where: { userId, seriesId },
      });
      if (events.length === 0) continue;
      const dates = events
        .map((event) => event.completedOn.toISOString().slice(0, 10))
        .sort();
      const recurrence = task.recurrence as 'daily' | 'weekly' | 'monthly';
      let streak = 1;
      for (let index = dates.length - 1; index > 0; index--) {
        const consecutive =
          recurrence === 'weekly'
            ? diffDays(dates[index - 1]!, dates[index]!) === 7
            : recurrence === 'monthly'
              ? diffMonths(dates[index - 1]!, dates[index]!) === 1
              : diffDays(dates[index - 1]!, dates[index]!) === 1;
        if (!consecutive) break;
        streak++;
      }
      const lastCompletedOn = dates.at(-1)!;
      const missed =
        recurrence === 'daily' &&
        lastCompletedOn !== today &&
        lastCompletedOn !== addDays(today, -1);
      const nextOccurrenceOn = recurringNextDate(lastCompletedOn, recurrence);
      result.push({
        taskId: task.id,
        title: task.title,
        currentStreak: missed ? 0 : streak,
        longestStreak: longestConsecutiveDates(dates, recurrence),
        lastCompletedOn,
        nextOccurrenceOn: nextOccurrenceOn >= today ? nextOccurrenceOn : null,
      });
    }
    return result
      .sort(
        (left, right) =>
          right.lastCompletedOn!.localeCompare(left.lastCompletedOn!) ||
          left.taskId - right.taskId
      )
      .slice(0, limit);
  }
}

function diffDays(left: string, right: string) {
  return Math.round(
    (Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) /
      86_400_000
  );
}

function diffMonths(left: string, right: string) {
  const a = left.slice(0, 7).split('-').map(Number);
  const b = right.slice(0, 7).split('-').map(Number);
  return (b[0]! - a[0]!) * 12 + b[1]! - a[1]!;
}

function recurringNextDate(
  date: string,
  recurrence: 'daily' | 'weekly' | 'monthly'
) {
  if (recurrence === 'daily') return addDays(date, 1);
  if (recurrence === 'weekly') return addDays(date, 7);
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}
