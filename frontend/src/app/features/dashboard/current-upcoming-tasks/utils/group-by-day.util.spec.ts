import type { Task } from '../../../tasks/shared/types/task.types';
import { addDays, groupByDay } from './group-by-day.util';

const TODAY = '2026-11-06';

function task(taskId: number, dueDate: string | null): Task {
  return {
    taskId,
    projectId: 10,
    priorityId: 3,
    title: `Task ${taskId}`,
    description: null,
    scheduledDate: null,
    dueDate,
    deadline: null,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    completedAt: null,
    sortOrder: 0,
    isRecurring: false,
    isArchived: false,
    labels: [],
  };
}

const ids = (tasks: Task[]) => tasks.map((t) => t.taskId);

describe('addDays', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-06', 1)).toBe('2026-11-07');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('groupByDay', () => {
  it('always returns Today, Tomorrow and Later in that order', () => {
    const groups = groupByDay([], TODAY);

    expect(groups.map((g) => g.key)).toEqual(['today', 'tomorrow', 'later']);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Tomorrow', 'Later']);
    expect(groups.every((g) => g.tasks.length === 0)).toBe(true);
  });

  it('puts each task in the group for its due date', () => {
    const [today, tomorrow, later] = groupByDay(
      [task(1, '2026-11-06'), task(2, '2026-11-07'), task(3, '2026-11-08'), task(4, '2026-11-13')],
      TODAY,
    );

    expect(ids(today.tasks)).toEqual([1]);
    expect(ids(tomorrow.tasks)).toEqual([2]);
    expect(ids(later.tasks)).toEqual([3, 4]);
  });

  it('finds tomorrow across a month end', () => {
    const [, tomorrow] = groupByDay([task(1, '2026-12-01')], '2026-11-30');
    expect(ids(tomorrow.tasks)).toEqual([1]);
  });

  it('leaves out unscheduled tasks and tasks due before today', () => {
    const groups = groupByDay([task(1, null), task(2, '2026-11-05')], TODAY);
    expect(groups.flatMap((g) => g.tasks)).toEqual([]);
  });

  it('sorts Later by due date and keeps the given order for the same day', () => {
    const [, , later] = groupByDay(
      [task(1, '2026-11-10'), task(2, '2026-11-09'), task(3, '2026-11-10')],
      TODAY,
    );
    expect(ids(later.tasks)).toEqual([2, 1, 3]);
  });

  it('keeps the given order within Today', () => {
    const [today] = groupByDay([task(5, TODAY), task(2, TODAY), task(9, TODAY)], TODAY);
    expect(ids(today.tasks)).toEqual([5, 2, 9]);
  });

  it('does not change the input', () => {
    const input = [task(1, '2026-11-10'), task(2, '2026-11-09')];
    groupByDay(input, TODAY);
    expect(ids(input)).toEqual([1, 2]);
  });
});
