import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SessionService } from '../../../../auth/session/session.service';
import { STREAKS_NOW } from '../../services/task-streaks.service';
import {
  STREAK_NOW,
  STREAK_TIMEZONE,
  STREAK_TODAY,
  apiStreak,
  recurringTask,
} from '../../testing/streak-fixtures';
import type { ApiTaskStreak } from '../../types/task-streak.types';
import { toTaskStreak } from '../../utils/streak-periods.util';
import { StreakBadge } from './streak-badge';

const streakUrl = (taskId: number) => `${environment.apiBaseUrl}/api/tasks/${taskId}/streak`;

describe('StreakBadge', () => {
  let fixture: ComponentFixture<StreakBadge>;
  let http: HttpTestingController;

  const badge = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.badge');
  const tooltip = () => document.querySelector<HTMLElement>('.cdk-overlay-container .tooltip');
  const text = (node: Element | null | undefined) => node?.textContent?.trim() ?? '';

  function render(
    streak: Partial<ApiTaskStreak> = {},
    recurrence: 'daily' | 'weekly' = 'daily',
  ): void {
    fixture = TestBed.createComponent(StreakBadge);
    fixture.componentRef.setInput('task', recurringTask(41, { recurrence }));
    fixture.detectChanges();
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

  it('shows nothing until the streak has loaded', () => {
    fixture = TestBed.createComponent(StreakBadge);
    fixture.componentRef.setInput('task', recurringTask(41));
    fixture.detectChanges();

    expect(badge()).toBeNull();
    http.expectOne(streakUrl(41)).flush(apiStreak(41));
    fixture.detectChanges();
    expect(badge()).not.toBeNull();
  });

  it('shows a flame with the current streak', () => {
    render({ currentStreak: 4, lastCompletedOn: STREAK_TODAY });

    expect(badge()?.querySelector('svg.flame')).not.toBeNull();
    expect(text(badge()?.querySelector('.count'))).toBe('4 days');
    expect(badge()?.getAttribute('aria-label')).toBe('Streak: 4 days');
    expect(badge()?.classList).not.toContain('at-risk');
  });

  it("looks at risk while today's occurrence is open", () => {
    render({ currentStreak: 4, lastCompletedOn: '2026-11-18' });

    expect(badge()?.classList).toContain('at-risk');
    expect(badge()?.getAttribute('aria-label')).toBe('Streak: 4 days, at risk');
  });

  it('greys out once the streak is broken', () => {
    render({ currentStreak: 3, lastCompletedOn: '2026-11-01' }, 'weekly');

    expect(text(badge()?.querySelector('.count'))).toBe('No streak yet');
    expect(badge()?.classList).toContain('cold');
    expect(badge()?.getAttribute('aria-label')).toBe('No streak yet');
  });

  it('shows the longest streak and last completion in a tooltip on hover and focus', () => {
    render({ currentStreak: 4, longestStreak: 7, lastCompletedOn: '2026-11-18' });
    expect(tooltip()).toBeNull();

    badge()!.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(Array.from(tooltip()!.querySelectorAll('.line'), text)).toEqual([
      'Longest streak: 7 days',
      'Last completed: Nov 18',
      'Due today. Complete it to keep the streak',
    ]);

    badge()!.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(tooltip()).toBeNull();

    badge()!.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(tooltip()).not.toBeNull();
    badge()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(tooltip()).toBeNull();
  });

  it('describes the same details to screen readers', () => {
    render({ longestStreak: 1, lastCompletedOn: STREAK_TODAY, currentStreak: 1 });

    const id = badge()!.getAttribute('aria-describedby')!;
    expect(text(document.getElementById(id))).toBe(
      'Longest streak: 1 day. Last completed: Nov 19.',
    );
  });

  it('uses a streak it is given instead of loading one', () => {
    fixture = TestBed.createComponent(StreakBadge);
    fixture.componentRef.setInput('task', recurringTask(41));
    fixture.componentRef.setInput(
      'streak',
      toTaskStreak(
        apiStreak(41, { currentStreak: 9, lastCompletedOn: STREAK_TODAY }),
        'daily',
        STREAK_TODAY,
      ),
    );
    fixture.detectChanges();

    http.expectNone(streakUrl(41));
    expect(text(badge()?.querySelector('.count'))).toBe('9 days');
  });
});
