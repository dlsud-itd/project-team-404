import type { Task } from '../../../tasks/shared/types/task.types';
import { seriesKey } from '../../../tasks/task-streaks/services/task-streaks.service';
import type { DashboardStreak } from '../../shared/types/dashboard.types';

export interface StreakTasks {
  /** The task the server named for the series, usually its oldest occurrence. */
  representative: Task | null;
  /** The series' open occurrence, the one Complete marks done; null when none or unsure. */
  open: Task | null;
  /** More than one open task could be this series' occurrence, so none is picked. */
  ambiguous: boolean;
}

/**
 * Finds the tasks behind a dashboard streak. The server names one task per series, usually an
 * occurrence that is already done, and never says which series a task is in. Each completion
 * adds the next occurrence as a new task with the same project, repeat and title, so the open
 * occurrence is the open task matching on all three that is not older than the one named.
 * Two series that share all three can't be told apart; then no task is picked rather than
 * possibly the wrong one.
 */
export function matchStreakTasks(streak: DashboardStreak, tasks: readonly Task[]): StreakTasks {
  const representative = tasks.find((task) => task.taskId === streak.taskId) ?? null;
  if (!representative) return { representative, open: null, ambiguous: false };
  if (representative.completedAt === null) {
    return { representative, open: representative, ambiguous: false };
  }

  const series = seriesKey(representative);
  const candidates = tasks.filter(
    (task) =>
      task.completedAt === null &&
      !task.isArchived &&
      task.taskId > representative.taskId &&
      seriesKey(task) === series,
  );
  if (candidates.length > 1) return { representative, open: null, ambiguous: true };
  return { representative, open: candidates[0] ?? null, ambiguous: false };
}
