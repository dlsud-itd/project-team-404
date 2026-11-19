import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../auth/session/session.service';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import type { Task } from '../../tasks/shared/types/task.types';
import { TaskService } from '../../tasks/task-crud/services/task.service';
import { STREAKS_NOW } from '../../tasks/task-streaks/services/task-streaks.service';
import {
  STREAK_NOW,
  STREAK_TIMEZONE,
  STREAK_TODAY,
  recurringTask,
} from '../../tasks/task-streaks/testing/streak-fixtures';
import type { DashboardStreak } from '../shared/types/dashboard.types';
import { StreaksSection } from './streaks-section';

const STREAKS_URL = `${environment.apiBaseUrl}/api/dashboard/streaks?limit=20`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const DONE = '2026-11-18T01:00:00.000Z';

function streak(taskId: number, title: string, overrides: Partial<DashboardStreak> = {}) {
  return {
    taskId,
    title,
    currentStreak: 3,
    longestStreak: 5,
    lastCompletedOn: '2026-11-18',
    nextOccurrenceOn: STREAK_TODAY,
    ...overrides,
  };
}

/** Each named series: an older done occurrence and its open one, ids `id` and `id + 1`. */
function series(id: number, title: string, overrides: Partial<Task> = {}): Task[] {
  return [
    recurringTask(id, { title, completedAt: DONE, ...overrides }),
    recurringTask(id + 1, { title, ...overrides }),
  ];
}

describe('StreaksSection', () => {
  let fixture: ComponentFixture<StreaksSection>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(el().querySelectorAll<HTMLElement>('.row'));
  const text = (node: Element | null | undefined) => node?.textContent?.trim() ?? '';
  const titles = () => rows().map((row) => text(row.querySelector('.title')));

  function create(): void {
    fixture = TestBed.createComponent(StreaksSection);
    fixture.detectChanges();
  }

  function expectTasksRequest(): TestRequest {
    return http.expectOne(
      (req) =>
        req.method === 'GET' && req.url === TASKS_URL && req.params.get('recurring') === 'true',
    );
  }

  function respond(streaks: DashboardStreak[], tasks: Task[]): void {
    http.expectOne(STREAKS_URL).flush({ streaks });
    expectTasksRequest().flush(tasks.map(asApiTask));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STREAKS_NOW, useValue: () => STREAK_NOW },
        {
          provide: SessionService,
          useValue: { currentUser: signal({ id: 'user-1', timezone: STREAK_TIMEZONE }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows a loading message until streaks arrive', () => {
    create();
    expect(text(el().querySelector('[role="status"]'))).toBe('Loading streaks…');
    respond([], []);
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('lists active streaks with the at-risk ones first and leaves broken ones out', () => {
    create();
    respond(
      [
        streak(10, 'Read', { lastCompletedOn: STREAK_TODAY, currentStreak: 6 }),
        streak(20, 'Stretch', { lastCompletedOn: '2026-11-18', currentStreak: 2 }),
        streak(30, 'Journal', { lastCompletedOn: '2026-11-10', currentStreak: 0 }),
        streak(40, 'Plan week', { lastCompletedOn: '2026-11-12', currentStreak: 4 }),
        streak(50, 'Budget', { lastCompletedOn: '2026-11-01', currentStreak: 3 }),
      ],
      [
        ...series(10, 'Read'),
        ...series(20, 'Stretch'),
        ...series(30, 'Journal'),
        ...series(40, 'Plan week', { recurrence: 'weekly' }),
        // A weekly streak the server still counts though its Nov 8 occurrence was missed.
        ...series(50, 'Budget', { recurrence: 'weekly' }),
      ],
    );

    expect(titles()).toEqual(['Stretch', 'Plan week', 'Read']);
    expect(rows().map((row) => row.classList.contains('at-risk'))).toEqual([true, true, false]);
    expect(text(rows()[0].querySelector('.risk'))).toBe('At risk · due today');
    expect(text(rows()[2].querySelector('.sub'))).toBe('Longest 5 days');
    expect(text(rows()[2].querySelector('.done'))).toBe('Done today');
    expect(rows()[2].querySelector('button.complete')).toBeNull();
    expect(text(rows()[0].querySelector('app-streak-badge .count'))).toBe('2 days');
    expect(text(el().querySelector('h2 .visually-hidden'))).toBe(', 3 active streaks, 2 at risk');
  });

  it('links each title to the open occurrence', () => {
    create();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    expect(rows()[0].querySelector('a.title')?.getAttribute('href')).toBe(
      '/projects/10/tasks/21/edit',
    );
  });

  it('completes the open occurrence and reloads the list without a page reload', () => {
    create();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    const button = rows()[0].querySelector<HTMLButtonElement>('button.complete')!;
    expect(button.getAttribute('aria-label')).toBe('Complete Stretch');
    button.click();
    fixture.detectChanges();
    expect(text(button)).toBe('Saving…');
    expect(button.disabled).toBe(true);

    const put = http.expectOne({ method: 'PUT', url: `${TASKS_URL}/21` });
    expect(put.request.body).toEqual({ isDone: true, doneAt: STREAK_NOW.toISOString() });
    put.flush({ id: 21, isDone: true, doneAt: STREAK_NOW.toISOString(), position: 1 });
    fixture.detectChanges();
    expect(text(el().querySelector('.notice'))).toBe('“Stretch” is done. Streak kept.');

    respond(
      [streak(20, 'Stretch', { currentStreak: 3, lastCompletedOn: STREAK_TODAY })],
      [
        recurringTask(20, { title: 'Stretch', completedAt: DONE }),
        recurringTask(21, { title: 'Stretch', completedAt: STREAK_NOW.toISOString() }),
        recurringTask(22, { title: 'Stretch', dueDate: '2026-11-20' }),
      ],
    );

    expect(rows()[0].classList).not.toContain('at-risk');
    expect(text(rows()[0].querySelector('.done'))).toBe('Done today');
    expect(text(rows()[0].querySelector('app-streak-badge .count'))).toBe('3 days');
  });

  it('keeps the list and shows the error when completing fails', () => {
    create();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    rows()[0].querySelector<HTMLButtonElement>('button.complete')!.click();
    http
      .expectOne({ method: 'PUT', url: `${TASKS_URL}/21` })
      .flush({ error: 'Task not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el().querySelector('.action-error')).not.toBeNull();
    expect(titles()).toEqual(['Stretch']);
    expect(rows()[0].querySelector<HTMLButtonElement>('button.complete')!.disabled).toBe(false);
  });

  it('does not offer Complete when the open occurrence cannot be told apart', () => {
    create();
    respond(
      [streak(20, 'Stretch')],
      [...series(20, 'Stretch'), recurringTask(25, { title: 'Stretch' })],
    );

    expect(rows()[0].querySelector('button.complete')).toBeNull();
    expect(text(rows()[0].querySelector('.hint'))).toBe('Open the task to complete it');
  });

  it('reloads when a task is completed elsewhere in the app', () => {
    create();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    TestBed.inject(TaskService).update(99, { completedAt: STREAK_NOW.toISOString() }).subscribe();
    http
      .expectOne({ method: 'PUT', url: `${TASKS_URL}/99` })
      .flush({ id: 99, isDone: true, doneAt: STREAK_NOW.toISOString(), position: 1 });

    respond([], []);
    expect(rows()).toHaveLength(0);
  });

  it('tells the user when their session has ended', () => {
    create();
    http.expectOne(STREAKS_URL).flush('', { status: 401, statusText: 'Unauthorized' });
    expectTasksRequest();
    fixture.detectChanges();

    expect(text(el().querySelector('[role="alert"] p'))).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('keeps the list when a background reload fails', () => {
    create();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    TestBed.inject(TaskService).update(99, { completedAt: STREAK_NOW.toISOString() }).subscribe();
    http
      .expectOne({ method: 'PUT', url: `${TASKS_URL}/99` })
      .flush({ id: 99, isDone: true, doneAt: STREAK_NOW.toISOString(), position: 1 });
    http.expectOne(STREAKS_URL).flush('boom', { status: 500, statusText: 'Server Error' });
    expectTasksRequest();
    fixture.detectChanges();

    expect(titles()).toEqual(['Stretch']);
    expect(text(el().querySelector('.action-error'))).toBe(
      "We couldn't load your streaks. Please try again.",
    );
  });

  it('shows the empty state when no streak is running', () => {
    create();
    respond(
      [streak(30, 'Journal', { currentStreak: 0, lastCompletedOn: '2026-11-10' })],
      series(30, 'Journal'),
    );

    expect(text(el().querySelector('.empty'))).toBe(
      'No active streaks. Complete a repeating task to start one.',
    );
  });

  it('shows an error and loads again on retry', () => {
    create();
    http.expectOne(STREAKS_URL).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(expectTasksRequest().cancelled).toBe(true);
    fixture.detectChanges();
    expect(text(el().querySelector('[role="alert"] p'))).toBe(
      "We couldn't load your streaks. Please try again.",
    );

    el().querySelector<HTMLButtonElement>('.retry')!.click();
    fixture.detectChanges();
    respond([streak(20, 'Stretch')], series(20, 'Stretch'));

    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(titles()).toEqual(['Stretch']);
  });
});
