import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SessionService } from '../../../auth/session/session.service';
import { TasksStore } from '../../shared/state/tasks.store';
import { TaskService } from '../../task-crud/services/task.service';
import { STREAK_NOW, STREAK_TIMEZONE, apiStreak, recurringTask } from '../testing/streak-fixtures';
import { STREAKS_NOW, TaskStreaksService, seriesKey } from './task-streaks.service';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const streakUrl = (taskId: number) => `${TASKS_URL}/${taskId}/streak`;

describe('TaskStreaksService', () => {
  let service: TaskStreaksService;
  let http: HttpTestingController;
  const user = signal<{ id: string; timezone: string } | null>({
    id: 'user-1',
    timezone: STREAK_TIMEZONE,
  });

  beforeEach(() => {
    user.set({ id: 'user-1', timezone: STREAK_TIMEZONE });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STREAKS_NOW, useValue: () => STREAK_NOW },
        { provide: SessionService, useValue: { currentUser: user } },
      ],
    });
    service = TestBed.inject(TaskStreaksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a recurring task streak once and shares it', () => {
    const task = recurringTask(41);
    service.watch(task);
    service.watch(task);

    expect(service.loadState(41)).toBe('loading');
    expect(service.streak(41)).toBeNull();
    http.expectOne(streakUrl(41)).flush(apiStreak(41));

    expect(service.loadState(41)).toBe('ready');
    expect(service.streak(41)).toMatchObject({
      taskId: 41,
      recurrence: 'daily',
      currentStreak: 4,
      longestStreak: 7,
      lastCompletedOn: '2026-11-18',
      status: 'at-risk',
      atRisk: true,
    });
  });

  it('ignores tasks that do not repeat', () => {
    service.watch(recurringTask(5, { recurrence: 'none' }));
    http.expectNone(streakUrl(5));
    expect(service.loadState(5)).toBeNull();
  });

  it('loads again when the repeat changes', () => {
    service.watch(recurringTask(41));
    http.expectOne(streakUrl(41)).flush(apiStreak(41));

    service.watch(recurringTask(41, { recurrence: 'weekly' }));
    http.expectOne(streakUrl(41)).flush(apiStreak(41, { lastCompletedOn: '2026-11-16' }));

    expect(service.streak(41)).toMatchObject({ recurrence: 'weekly', status: 'done' });
  });

  it('records a failed load and loads again on refresh', () => {
    service.watch(recurringTask(41));
    http.expectOne(streakUrl(41)).flush('down', { status: 500, statusText: 'Server Error' });
    expect(service.loadState(41)).toBe('error');
    expect(service.streak(41)).toBeNull();

    service.refresh(41);
    expect(service.loadState(41)).toBe('loading');
    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    expect(service.loadState(41)).toBe('ready');
  });

  it('keeps the last streak while a refresh is in flight, and drops a superseded request', () => {
    service.watch(recurringTask(41));
    http.expectOne(streakUrl(41)).flush(apiStreak(41));

    service.refresh(41);
    const stale = http.expectOne(streakUrl(41));
    service.refresh(41);
    expect(stale.cancelled).toBe(true);
    expect(service.streak(41)?.currentStreak).toBe(4);

    http.expectOne(streakUrl(41)).flush(apiStreak(41, { currentStreak: 5 }));
    expect(service.streak(41)?.currentStreak).toBe(5);
  });

  it('decides today in the timezone the server sent, so both agree on the day', () => {
    service.watch(recurringTask(41));
    // Still Nov 18 in Los Angeles, so the Nov 18 completion counts as today's.
    http
      .expectOne(streakUrl(41))
      .flush(apiStreak(41, { timezone: 'America/Los_Angeles', lastCompletedOn: '2026-11-18' }));

    expect(service.streak(41)).toMatchObject({ status: 'done', atRisk: false });
  });

  it('reloads the completed task and the other occurrences of its series', () => {
    const tasks = TestBed.inject(TaskService);
    const store = TestBed.inject(TasksStore);
    const done = recurringTask(30, { completedAt: '2026-11-18T01:00:00.000Z' });
    const open = recurringTask(41);
    const other = recurringTask(50, { title: 'Evening stretch' });
    store.setTasks(10, [done, open, other]);
    for (const task of [done, open, other]) service.watch(task);
    for (const id of [30, 41, 50]) http.expectOne(streakUrl(id)).flush(apiStreak(id));

    tasks.update(41, { completedAt: STREAK_NOW.toISOString() }).subscribe();
    http.expectOne({ method: 'PUT', url: `${TASKS_URL}/41` }).flush({
      id: 41,
      isDone: true,
      doneAt: STREAK_NOW.toISOString(),
      position: 1,
    });

    const reloaded = { currentStreak: 5, lastCompletedOn: '2026-11-19' };
    http.expectOne(streakUrl(30)).flush(apiStreak(30, reloaded));
    http.expectOne(streakUrl(41)).flush(apiStreak(41, reloaded));
    http.expectNone(streakUrl(50));
    expect(service.streak(41)).toMatchObject({ currentStreak: 5, status: 'done' });
    expect(service.streak(30)?.currentStreak).toBe(5);
  });

  it('starts watching a completed task it had not loaded yet', () => {
    TestBed.inject(TasksStore).setTasks(10, [recurringTask(41)]);
    TestBed.inject(TaskService).update(41, { completedAt: STREAK_NOW.toISOString() }).subscribe();
    http
      .expectOne({ method: 'PUT', url: `${TASKS_URL}/41` })
      .flush({ id: 41, isDone: true, doneAt: STREAK_NOW.toISOString(), position: 1 });

    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    expect(service.loadState(41)).toBe('ready');
  });

  it('does not reload streaks for edits that leave completion alone', () => {
    service.watch(recurringTask(41));
    http.expectOne(streakUrl(41)).flush(apiStreak(41));

    TestBed.inject(TaskService).update(41, { title: 'Renamed' }).subscribe();
    http
      .expectOne({ method: 'PUT', url: `${TASKS_URL}/41` })
      .flush({ id: 41, isDone: false, doneAt: null, position: 1 });

    http.expectNone(streakUrl(41));
  });

  it('forgets every streak when a different user signs in', () => {
    service.watch(recurringTask(41));
    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    TestBed.tick();

    user.set({ id: 'user-2', timezone: STREAK_TIMEZONE });
    TestBed.tick();

    expect(service.loadState(41)).toBeNull();
    expect(service.streak(41)).toBeNull();
  });

  it('keys a series by project, repeat and title', () => {
    expect(seriesKey(recurringTask(1))).toBe(seriesKey(recurringTask(2)));
    expect(seriesKey(recurringTask(1))).not.toBe(seriesKey(recurringTask(2, { projectId: 11 })));
    expect(seriesKey(recurringTask(1))).not.toBe(
      seriesKey(recurringTask(2, { recurrence: 'weekly' })),
    );
  });
});
