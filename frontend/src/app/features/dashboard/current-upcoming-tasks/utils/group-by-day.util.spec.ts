import { dashboardTask } from '../../testing/helpers/dashboard-task';
import { addDays, byDueDateAndTime, dayOf, groupByDay, toDateKey } from './group-by-day.util';

// Thursday 5 November 2026, mid-afternoon local time.
const NOW = new Date(2026, 10, 5, 15, 30);

describe('group-by-day.util', () => {
  describe('toDateKey', () => {
    it('formats the local date with zero padding', () => {
      expect(toDateKey(new Date(2026, 0, 7))).toBe('2026-01-07');
    });

    it('uses the local day even just before midnight', () => {
      expect(toDateKey(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    });
  });

  describe('addDays', () => {
    it('moves forward across month and year ends', () => {
      expect(addDays(NOW, 1)).toBe('2026-11-06');
      expect(addDays(new Date(2026, 0, 31), 1)).toBe('2026-02-01');
      expect(addDays(new Date(2026, 11, 31), 1)).toBe('2027-01-01');
      expect(addDays(new Date(2028, 1, 28), 1)).toBe('2028-02-29');
    });
  });

  describe('dayOf', () => {
    const today = '2026-11-05';
    const tomorrow = '2026-11-06';

    it('puts a task due today in Today', () => {
      expect(dayOf(dashboardTask({ dueDate: today }), today, tomorrow)).toBe('today');
    });

    it('puts a task due tomorrow in Tomorrow', () => {
      expect(dayOf(dashboardTask({ dueDate: tomorrow }), today, tomorrow)).toBe('tomorrow');
    });

    it('puts anything later in Later', () => {
      expect(dayOf(dashboardTask({ dueDate: '2026-11-07' }), today, tomorrow)).toBe('later');
      expect(dayOf(dashboardTask({ dueDate: '2027-01-01' }), today, tomorrow)).toBe('later');
    });

    it('trusts the server when it says a task is current', () => {
      // E.g. just after midnight, before the server's day has rolled over.
      const task = dashboardTask({ status: 'current', dueDate: tomorrow });
      expect(dayOf(task, today, tomorrow)).toBe('today');
    });

    it('keeps a task whose due date has just passed in Today', () => {
      expect(dayOf(dashboardTask({ dueDate: '2026-11-04' }), today, tomorrow)).toBe('today');
    });

    it('puts a task with no due date in Later', () => {
      expect(dayOf(dashboardTask({ dueDate: null }), today, tomorrow)).toBe('later');
    });
  });

  describe('byDueDateAndTime', () => {
    it('orders by date, then timed before untimed, then manual order, then id', () => {
      const tasks = [
        dashboardTask({ taskId: 1, dueDate: '2026-11-06' }),
        dashboardTask({ taskId: 2, dueDate: '2026-11-05' }),
        dashboardTask({ taskId: 3, dueDate: '2026-11-05', dueTime: '18:00:00' }),
        dashboardTask({ taskId: 4, dueDate: '2026-11-05', dueTime: '09:00:00' }),
        dashboardTask({ taskId: 5, dueDate: null }),
        dashboardTask({ taskId: 6, dueDate: '2026-11-05', sortOrder: -1 }),
        dashboardTask({ taskId: 7, dueDate: '2026-11-05', sortOrder: -1 }),
      ];

      expect([...tasks].sort(byDueDateAndTime).map((t) => t.taskId)).toEqual([4, 3, 6, 7, 2, 1, 5]);
    });
  });

  describe('groupByDay', () => {
    it('always returns Today, Tomorrow and Later in that order, with their dates', () => {
      const groups = groupByDay([], NOW);

      expect(groups.map((g) => [g.key, g.title, g.date])).toEqual([
        ['today', 'Today', '2026-11-05'],
        ['tomorrow', 'Tomorrow', '2026-11-06'],
        ['later', 'Later', null],
      ]);
      expect(groups.every((g) => g.tasks.length === 0)).toBe(true);
    });

    it('sorts each task into its day, in due order', () => {
      const tasks = [
        dashboardTask({ taskId: 1, dueDate: '2026-11-20' }),
        dashboardTask({ taskId: 2, dueDate: '2026-11-06', dueTime: '08:00:00' }),
        dashboardTask({ taskId: 3, status: 'current', dueDate: '2026-11-05', dueTime: '17:00:00' }),
        dashboardTask({ taskId: 4, dueDate: '2026-11-07' }),
        dashboardTask({ taskId: 5, status: 'current', dueDate: '2026-11-05', dueTime: '09:00:00' }),
      ];

      const [today, tomorrow, later] = groupByDay(tasks, NOW);

      expect(today.tasks.map((t) => t.taskId)).toEqual([5, 3]);
      expect(tomorrow.tasks.map((t) => t.taskId)).toEqual([2]);
      expect(later.tasks.map((t) => t.taskId)).toEqual([4, 1]);
    });

    it('does not reorder the list it was given', () => {
      const tasks = [
        dashboardTask({ taskId: 1, dueDate: '2026-11-08' }),
        dashboardTask({ taskId: 2, dueDate: '2026-11-07' }),
      ];

      groupByDay(tasks, NOW);

      expect(tasks.map((t) => t.taskId)).toEqual([1, 2]);
    });

    it('rolls Tomorrow over a month end', () => {
      const [, tomorrow] = groupByDay(
        [dashboardTask({ taskId: 1, dueDate: '2026-12-01' })],
        new Date(2026, 10, 30, 22, 0),
      );

      expect(tomorrow.date).toBe('2026-12-01');
      expect(tomorrow.tasks.map((t) => t.taskId)).toEqual([1]);
    });

    it('defaults to the current day', () => {
      const [today] = groupByDay([dashboardTask({ dueDate: toDateKey(new Date()) })]);

      expect(today.tasks).toHaveLength(1);
    });
  });
});
