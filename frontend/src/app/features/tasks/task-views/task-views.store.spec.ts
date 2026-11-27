import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TaskViewsStore, parseTaskView, taskViewStorageKey } from './task-views.store';

/** A page that provides the store the way TaskList does. */
@Component({ template: '', providers: [TaskViewsStore] })
class Page {
  readonly store = inject(TaskViewsStore);
}

describe('TaskViewsStore', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  async function open(url: string, projectId = 10): Promise<TaskViewsStore> {
    const page = await harness.navigateByUrl(url, Page);
    page.store.setProject(projectId);
    return page.store;
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'tasks', component: Page }])],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('opens on the list when nothing says otherwise', async () => {
    const store = await open('/tasks');

    expect(store.view()).toBe('list');
    expect(localStorage.getItem(taskViewStorageKey(10))).toBeNull();
  });

  it('opens on the view in the URL and remembers it for the project', async () => {
    const store = await open('/tasks?view=table');

    expect(store.view()).toBe('table');
    expect(localStorage.getItem(taskViewStorageKey(10))).toBe('table');
  });

  it('falls back to the view last saved for this project', async () => {
    localStorage.setItem(taskViewStorageKey(10), 'board');
    localStorage.setItem(taskViewStorageKey(11), 'table');

    expect((await open('/tasks', 10)).view()).toBe('board');
  });

  it('lets the URL win over the saved view', async () => {
    localStorage.setItem(taskViewStorageKey(10), 'board');

    const store = await open('/tasks?view=list');

    expect(store.view()).toBe('list');
    expect(localStorage.getItem(taskViewStorageKey(10))).toBe('list');
  });

  it('follows the URL as it changes and saves each view', async () => {
    const store = await open('/tasks');

    await router.navigateByUrl('/tasks?view=board');
    expect(store.view()).toBe('board');
    expect(localStorage.getItem(taskViewStorageKey(10))).toBe('board');

    // Leaving the param out again keeps the remembered view rather than jumping back to List.
    await router.navigateByUrl('/tasks');
    expect(store.view()).toBe('board');
  });

  it('reads each project’s own view when the page moves between projects', async () => {
    localStorage.setItem(taskViewStorageKey(11), 'table');
    const store = await open('/tasks', 10);
    expect(store.view()).toBe('list');

    store.setProject(11);

    expect(store.view()).toBe('table');
  });

  it('ignores unknown views, in the URL and in storage', async () => {
    localStorage.setItem(taskViewStorageKey(10), 'calendar');
    expect((await open('/tasks?view=gantt')).view()).toBe('list');

    expect(parseTaskView(null)).toBeNull();
    expect(['list', 'table', 'board', 'timeline'].map(parseTaskView)).toEqual([
      'list',
      'table',
      'board',
      'timeline',
    ]);
  });

  it('still works when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect((await open('/tasks')).view()).toBe('list');
    expect((await open('/tasks?view=table')).view()).toBe('table');
  });
});
