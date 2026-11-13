import { TestBed } from '@angular/core/testing';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS, task } from './testing/dashboard-fixture';
import { DashboardStore, toDateKey } from './dashboard.store';

const NOW = new Date(2026, 9, 30, 9, 0, 0);

describe('DashboardStore', () => {
  let store: DashboardStore;

  const titles = (tasks: { title: string }[]) => tasks.map((item) => item.title);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({ providers: [DashboardStore] });
    store = TestBed.inject(DashboardStore);
  });

  afterEach(() => vi.useRealTimers());

  it('starts empty instead of displaying sample content', () => {
    expect(store.projects()).toEqual([]);
    expect(store.tasks()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });

  it('formats dates as local YYYY-MM-DD keys', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(store.today()).toBe('2026-10-30');
  });

  it('derives counts and statuses from loaded API models', () => {
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);

    expect(store.openTasks()).toHaveLength(8);
    expect(store.doneToday()).toBe(1);
    expect(store.overdueCount()).toBe(2);
    const { current, upcoming, overdue, done } = store.byStatus();
    expect(titles(overdue)).toEqual(['Submit lab report', 'Reply to client email']);
    expect(titles(current)).toEqual(['Read chapter 4', 'Team stand-up notes']);
    expect(titles(upcoming)).toEqual([
      'Study for quiz',
      'Prepare sprint demo',
      'Call grandma',
      'Plan weekend trip',
    ]);
    expect(titles(done)).toEqual(['Gym session']);
    expect(store.loaded()).toBe(true);
  });

  it('counts open tasks by project and priority', () => {
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);

    expect([...store.projectCounts()]).toEqual([
      [1, 3],
      [2, 3],
      [3, 2],
    ]);
    expect(Object.fromEntries(store.priorityCounts())).toEqual({ 1: 3, 2: 3, 3: 2 });
  });

  it('filters live tasks by project or priority and sorts open tasks first', () => {
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    store.filter.set({ projectId: 3 });
    expect(titles(store.filteredTasks())).toEqual([
      'Call grandma',
      'Plan weekend trip',
      'Gym session',
    ]);

    store.filter.set({ priorityId: 1 });
    expect(titles(store.filteredTasks())).toEqual([
      'Submit lab report',
      'Study for quiz',
      'Prepare sprint demo',
    ]);
  });

  it('updates completion and removes tasks after successful API actions', () => {
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    const completedAt = new Date(2026, 9, 30, 11).toISOString();
    store.setTaskCompletion(6, completedAt);
    expect(store.tasks().find((item) => item.id === 6)).toMatchObject({
      done: true,
      doneOn: '2026-10-30',
    });
    expect(store.doneToday()).toBe(2);

    store.setTaskCompletion(6, null);
    expect(store.tasks().find((item) => item.id === 6)?.done).toBe(false);
    store.removeTask(6);
    expect(titles(store.tasks())).not.toContain('Study for quiz');
  });

  it('adds or replaces a task returned by the API', () => {
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    store.upsertTask(task(10, 'Write essay', 1, 1, '2026-10-30'));
    expect(store.tasks().at(-1)).toMatchObject({ title: 'Write essay', done: false });

    store.upsertTask(task(10, 'Revised essay', 1, 1, '2026-10-30'));
    expect(store.tasks().filter((item) => item.id === 10)).toHaveLength(1);
    expect(store.tasks().find((item) => item.id === 10)?.title).toBe('Revised essay');
  });

  it('keeps Inbox, excludes archived projects and calendar ignores tasks without a due date', () => {
    store.setData(
      [
        ...DASHBOARD_PROJECTS,
        { ...DASHBOARD_PROJECTS[0], projectId: 5, name: 'Archived', isArchived: true },
      ],
      [task(10, 'Unscheduled', 4, 2, null)],
    );

    expect(store.projects().map((project) => project.name)).toEqual([
      'Inbox',
      'School',
      'Work',
      'Personal',
    ]);
    expect(store.tasksByDay().size).toBe(0);
    expect(store.byStatus().unscheduled.map((item) => item.title)).toEqual(['Unscheduled']);
  });
});
