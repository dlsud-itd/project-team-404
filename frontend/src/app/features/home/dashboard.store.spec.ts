import { TestBed } from '@angular/core/testing';
import { DashboardStore, toDateKey } from './dashboard.store';

/** Friday 30 October 2026, 09:00 local time; the sample tasks are dated relative to it. */
const NOW = new Date(2026, 9, 30, 9, 0, 0);

describe('DashboardStore', () => {
  let store: DashboardStore;

  const titles = (tasks: { title: string }[]) => tasks.map((t) => t.title);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({ providers: [DashboardStore] });
    store = TestBed.inject(DashboardStore);
  });

  afterEach(() => vi.useRealTimers());

  it('formats dates as local YYYY-MM-DD keys', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(store.today()).toBe('2026-10-30');
  });

  it('counts open tasks, tasks done today and overdue tasks', () => {
    expect(store.openTasks()).toHaveLength(8);
    expect(store.doneToday()).toBe(1);
    expect(store.overdueCount()).toBe(2);
  });

  it('groups tasks by status: done, then past, today and future due dates', () => {
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
  });

  it('counts open tasks per project and per priority', () => {
    expect([...store.projectCounts()]).toEqual([
      [1, 3],
      [2, 3],
      [3, 2],
    ]);
    expect(store.priorityCounts()).toEqual({ high: 3, medium: 3, low: 2 });
  });

  it('filters by project or priority and sorts open tasks first, by due date', () => {
    store.filter.set({ projectId: 3 });
    expect(titles(store.filteredTasks())).toEqual([
      'Call grandma',
      'Plan weekend trip',
      'Gym session',
    ]);

    store.filter.set({ priority: 'high' });
    expect(titles(store.filteredTasks())).toEqual([
      'Submit lab report',
      'Study for quiz',
      'Prepare sprint demo',
    ]);
  });

  it('adds, toggles and deletes tasks', () => {
    store.addTask({ title: 'Write essay', projectId: 1, priority: 'high', due: '2026-10-30' });
    const essay = store.tasks().at(-1)!;
    expect(essay).toMatchObject({ title: 'Write essay', done: false });
    expect(store.statusOf(essay)).toBe('current');

    store.toggleTask(essay.id);
    expect(store.tasks().at(-1)).toMatchObject({ done: true, doneOn: '2026-10-30' });
    expect(store.doneToday()).toBe(2);

    store.toggleTask(essay.id);
    expect(store.tasks().at(-1)).toMatchObject({ done: false, doneOn: undefined });

    store.deleteTask(essay.id);
    expect(titles(store.tasks())).not.toContain('Write essay');
  });

  it('adds and renames projects', () => {
    store.addProject('Thesis');
    const thesis = store.projects().at(-1)!;
    expect(thesis.name).toBe('Thesis');
    expect(thesis.color).toMatch(/^#[0-9a-f]{6}$/i);

    store.renameProject(thesis.id, 'Capstone');
    expect(store.projectById(thesis.id)?.name).toBe('Capstone');
  });

  it('deletes a project, keeps its tasks without a project and clears its filter', () => {
    store.filter.set({ projectId: 2 });
    store.deleteProject(2);

    expect(store.projectById(2)).toBeUndefined();
    expect(store.tasks()).toHaveLength(9);
    expect(store.tasks().filter((t) => t.projectId === 2)).toEqual([]);
    expect(store.filter()).toEqual({});
  });

  it('keeps another filter when a different project is deleted', () => {
    store.filter.set({ projectId: 1 });
    store.deleteProject(3);

    expect(store.filter()).toEqual({ projectId: 1 });
  });
});
