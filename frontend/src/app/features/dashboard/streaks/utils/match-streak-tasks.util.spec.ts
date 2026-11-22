import { recurringTask } from '../../../tasks/task-streaks/testing/streak-fixtures';
import type { DashboardStreak } from '../../shared/types/dashboard.types';
import { matchStreakTasks } from './match-streak-tasks.util';

const DONE = '2026-11-18T01:00:00.000Z';

function streak(taskId: number): DashboardStreak {
  return {
    taskId,
    title: 'Morning review',
    currentStreak: 3,
    longestStreak: 3,
    lastCompletedOn: '2026-11-18',
    nextOccurrenceOn: '2026-11-19',
  };
}

describe('matchStreakTasks', () => {
  it('uses the named task when it is still open', () => {
    const open = recurringTask(41);
    expect(matchStreakTasks(streak(41), [open])).toEqual({
      representative: open,
      open,
      ambiguous: false,
    });
  });

  it('finds the newer open occurrence of a done task by project, repeat and title', () => {
    const done = recurringTask(30, { completedAt: DONE });
    const open = recurringTask(41);
    const tasks = [
      done,
      recurringTask(35, { completedAt: DONE }),
      recurringTask(20),
      recurringTask(42, { title: 'Other' }),
      recurringTask(43, { projectId: 11 }),
      recurringTask(44, { recurrence: 'weekly' }),
      open,
    ];

    expect(matchStreakTasks(streak(30), tasks)).toEqual({
      representative: done,
      open,
      ambiguous: false,
    });
  });

  it('picks nothing when two open tasks could be the occurrence', () => {
    const tasks = [recurringTask(30, { completedAt: DONE }), recurringTask(41), recurringTask(45)];
    expect(matchStreakTasks(streak(30), tasks)).toMatchObject({ open: null, ambiguous: true });
  });

  it('has no open occurrence once the repeat has ended', () => {
    const done = recurringTask(30, { completedAt: DONE });
    expect(matchStreakTasks(streak(30), [done])).toEqual({
      representative: done,
      open: null,
      ambiguous: false,
    });
  });

  it('finds nothing when the named task is not in the list', () => {
    expect(matchStreakTasks(streak(30), [recurringTask(41)])).toEqual({
      representative: null,
      open: null,
      ambiguous: false,
    });
  });
});
