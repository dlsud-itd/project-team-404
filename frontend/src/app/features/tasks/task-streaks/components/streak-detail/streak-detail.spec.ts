import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SessionService } from '../../../../auth/session/session.service';
import type { TaskRecurrence } from '../../../task-scheduling/types/task-scheduling.types';
import { STREAKS_NOW } from '../../services/task-streaks.service';
import {
  STREAK_NOW,
  STREAK_TIMEZONE,
  STREAK_TODAY,
  apiStreak,
  recurringTask,
} from '../../testing/streak-fixtures';
import type { ApiTaskStreak } from '../../types/task-streak.types';
import { StreakDetail } from './streak-detail';

const streakUrl = (taskId: number) => `${environment.apiBaseUrl}/api/tasks/${taskId}/streak`;

describe('StreakDetail', () => {
  let fixture: ComponentFixture<StreakDetail>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => el().querySelector(selector)?.textContent?.trim() ?? '';
  const cells = () => Array.from(el().querySelectorAll<HTMLElement>('ol.strip .cell'));

  function create(recurrence: TaskRecurrence = 'daily'): void {
    fixture = TestBed.createComponent(StreakDetail);
    fixture.componentRef.setInput('task', recurringTask(41, { recurrence }));
    fixture.detectChanges();
  }

  function render(streak: Partial<ApiTaskStreak> = {}, recurrence: TaskRecurrence = 'daily'): void {
    create(recurrence);
    http.expectOne(streakUrl(41)).flush(apiStreak(41, streak));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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

  it('shows a loading message until the streak arrives', () => {
    create();
    expect(text('[role="status"]')).toBe('Loading streak…');
    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    fixture.detectChanges();
    expect(text('.status')).toBe('');
  });

  it('shows the current and longest streak, the last completion and the next due day', () => {
    render({ currentStreak: 4, longestStreak: 7, lastCompletedOn: STREAK_TODAY });

    expect(text('h2')).toBe('Streak');
    expect(text('.current')).toBe('4 days');
    expect(text('.longest')).toBe('7 days');
    expect(text('.last')).toBe('Nov 19');
    expect(text('.next')).toBe('Nov 20');
    expect(el().querySelector('app-streak-badge .badge')).not.toBeNull();
  });

  it('marks the last 14 periods done, missed or open, oldest first', () => {
    render({ currentStreak: 0, longestStreak: 6, lastCompletedOn: '2026-11-15' });

    expect(cells()).toHaveLength(14);
    expect(
      cells()
        .slice(-5)
        .map((cell) => cell.dataset['state']),
    ).toEqual(['done', 'missed', 'missed', 'missed', 'open']);
    expect(cells().at(-1)?.getAttribute('aria-label')).toBe('Nov 19: Open');
    expect(cells().at(-5)?.getAttribute('aria-label')).toBe('Nov 15: Done');
    expect(cells()[0].getAttribute('aria-label')).toBe('Nov 6: No record');
    expect(el().querySelector('ol.strip')?.getAttribute('aria-label')).toBe(
      'Last 14 periods, oldest first',
    );
  });

  it('labels weekly and monthly periods by what they cover', () => {
    render({ currentStreak: 2, lastCompletedOn: '2026-11-12' }, 'weekly');
    expect(cells().at(-1)?.getAttribute('aria-label')).toBe('Week of Nov 19: Open');
    expect(text('.current')).toBe('2 weeks');
    fixture.destroy();

    fixture = TestBed.createComponent(StreakDetail);
    fixture.componentRef.setInput('task', recurringTask(42, { recurrence: 'monthly' }));
    fixture.detectChanges();
    http
      .expectOne(streakUrl(42))
      .flush(apiStreak(42, { currentStreak: 1, lastCompletedOn: '2026-11-03' }));
    fixture.detectChanges();
    expect(cells().at(-1)?.getAttribute('aria-label')).toBe('November 2026: Done');
  });

  it("warns when today's occurrence is open and the streak is at risk", () => {
    render({ currentStreak: 4, lastCompletedOn: '2026-11-18' });

    expect(text('.risk')).toBe('Due today. Complete it to keep your streak going.');
    expect(text('.next')).toBe('Nov 19');
  });

  it('explains a broken streak and shows it as 0', () => {
    render({ currentStreak: 3, lastCompletedOn: '2026-11-01' }, 'weekly');

    expect(text('.current')).toBe('No streak yet');
    expect(text('.note')).toContain('The last occurrence was missed');
    expect(el().querySelector('.next')).toBeNull();
  });

  it('says when nothing has been completed yet', () => {
    render({ currentStreak: 0, longestStreak: 0, lastCompletedOn: null, nextOccurrenceOn: null });

    expect(text('.last')).toBe('Not yet');
    expect(cells().map((cell) => cell.dataset['state'])).toEqual([
      ...Array(13).fill('unknown'),
      'open',
    ]);
  });

  it('shows an error and loads again on retry', () => {
    create();
    http.expectOne(streakUrl(41)).flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(text('[role="alert"] p')).toBe("Couldn't load this streak.");

    el().querySelector<HTMLButtonElement>('.retry')!.click();
    fixture.detectChanges();
    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(text('.current')).toBe('4 days');
  });
});
