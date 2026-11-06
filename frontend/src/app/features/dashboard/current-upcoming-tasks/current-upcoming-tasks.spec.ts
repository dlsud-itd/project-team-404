import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../auth/session/session.service';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import type { Task } from '../../tasks/shared/types/task.types';
import { DASHBOARD_NOW } from '../shared/services/dashboard.service';
import { CurrentUpcomingTasks } from './current-upcoming-tasks';

const URL = `${environment.apiBaseUrl}/api/dashboard/current-upcoming-tasks`;
// Noon on Nov 6 in Manila, but still Nov 5 in the Americas: today must follow the user's zone.
const NOW = new Date('2026-11-06T04:00:00.000Z');

function task(taskId: number, dueDate: string): Task {
  return {
    taskId,
    projectId: 10,
    priorityId: 3,
    title: `Task ${taskId}`,
    description: null,
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

describe('CurrentUpcomingTasks', () => {
  let fixture: ComponentFixture<CurrentUpcomingTasks>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const titlesIn = (key: string) =>
    Array.from(el().querySelectorAll(`[data-group="${key}"] .title`)).map((n) =>
      n.textContent?.trim(),
    );

  function create(days?: number): void {
    fixture = TestBed.createComponent(CurrentUpcomingTasks);
    if (days !== undefined) fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
  }

  function respond(tasks: Task[], url = `${URL}?days=7`): void {
    http.expectOne(url).flush({ tasks: tasks.map(asApiTask) });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DASHBOARD_NOW, useValue: () => NOW },
        {
          provide: SessionService,
          useValue: { currentUser: signal({ username: 'james', timezone: 'Asia/Manila' }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows a loading message until the tasks arrive', () => {
    create();
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Loading');
    respond([]);
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('groups the tasks into Today, Tomorrow and Later in the user’s timezone', () => {
    create();
    respond([
      task(1, '2026-11-06'),
      task(2, '2026-11-07'),
      task(3, '2026-11-09'),
      task(4, '2026-11-06'),
    ]);

    const headings = Array.from(el().querySelectorAll('h3')).map((h) =>
      h.firstChild?.textContent?.trim(),
    );
    expect(headings).toEqual(['Today', 'Tomorrow', 'Later']);
    expect(titlesIn('today')).toEqual(['Task 1', 'Task 4']);
    expect(titlesIn('tomorrow')).toEqual(['Task 2']);
    expect(titlesIn('later')).toEqual(['Task 3']);
    expect(el().querySelector('.summary')?.textContent?.trim()).toBe('4 tasks');
  });

  it('shows every group’s empty message when nothing is due', () => {
    create();
    respond([]);

    expect(Array.from(el().querySelectorAll('.empty')).map((n) => n.textContent?.trim())).toEqual([
      'Nothing due today.',
      'Nothing due tomorrow.',
      'Nothing else due this week.',
    ]);
    expect(el().querySelector('.summary')?.textContent?.trim()).toBe('0 tasks');
  });

  it('asks for the bound number of days', () => {
    create(14);
    respond([], `${URL}?days=14`);
  });

  it('shows an error with a retry that loads again', () => {
    create();
    http.expectOne(`${URL}?days=7`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain("couldn't load");

    (el().querySelector('.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    respond([task(1, '2026-11-06')]);

    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(titlesIn('today')).toEqual(['Task 1']);
  });
});
