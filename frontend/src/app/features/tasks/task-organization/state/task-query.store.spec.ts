import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { TaskQuery } from '../types/task-query.types';
import { TaskQueryStore } from './task-query.store';

/** A page that provides the store the way TaskList does. */
@Component({ template: '', providers: [TaskQueryStore] })
class Page {
  readonly store = inject(TaskQueryStore);
}

describe('TaskQueryStore', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  async function open(url: string): Promise<TaskQueryStore> {
    const page = await harness.navigateByUrl(url, Page);
    return page.store;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'tasks', component: Page },
          { path: 'other', component: Page },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => vi.useRealTimers());

  it('starts from the filters in the URL', async () => {
    const store = await open('/tasks?priorities=high&status=active&orderBy=title');

    expect(store.query()).toMatchObject({
      priorities: ['high'],
      status: 'active',
      orderBy: 'title',
    });
    expect(store.count()).toBe(2);
  });

  it('writes changes to the URL, keeping params it does not own', async () => {
    const store = await open('/tasks?tab=list');

    store.set({ labelIds: [4, 9], labelMatch: 'all' });
    await harness.fixture.whenStable();

    expect(router.url).toBe('/tasks?tab=list&labelIds=4,9&labelMatch=all');
    expect(store.count()).toBe(1);
  });

  it('clears the filters but keeps the sort', async () => {
    const store = await open('/tasks?status=active&due=today&orderBy=deadline&orderDirection=desc');

    store.clear();
    await harness.fixture.whenStable();

    expect(store.count()).toBe(0);
    expect(router.url).toBe('/tasks?orderBy=deadline&orderDirection=desc');
  });

  it('follows the URL when it changes from outside, e.g. Back', async () => {
    const store = await open('/tasks?status=active');

    await harness.navigateByUrl('/tasks?status=completed&recurring=true');

    expect(store.query()).toMatchObject({ status: 'completed', recurring: true });
  });

  it('emits one reload for a burst of changes, after the pause', async () => {
    const store = await open('/tasks');
    vi.useFakeTimers();
    const emitted: TaskQuery[] = [];
    const subscription = store.changes$.subscribe((query) => emitted.push(query));

    store.set({ status: 'active' });
    store.set({ recurring: true });
    vi.advanceTimersByTime(200);
    store.set({ priorities: ['high'] });
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(250);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      status: 'active',
      recurring: true,
      priorities: ['high'],
    });
    subscription.unsubscribe();
  });

  it('does not reload when a burst of changes ends where it started', async () => {
    const store = await open('/tasks');
    vi.useFakeTimers();
    const emitted: TaskQuery[] = [];
    const subscription = store.changes$.subscribe((query) => emitted.push(query));

    store.set({ status: 'active' });
    store.set({ status: 'all' });
    vi.advanceTimersByTime(300);

    expect(emitted).toEqual([]);
    subscription.unsubscribe();
  });
});
