import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { dashboardTask, tasksResponse } from '../testing/helpers/dashboard-task';
import { CurrentUpcomingTasks } from './current-upcoming-tasks';

const TASKS_URL = `${environment.apiBaseUrl}/api/dashboard/tasks`;
// Thursday 5 November 2026.
const TODAY = new Date(2026, 10, 5, 9, 0);

describe('CurrentUpcomingTasks', () => {
  let fixture: ComponentFixture<CurrentUpcomingTasks>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const all = (selector: string) => Array.from(page.querySelectorAll(selector));
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const titlesIn = (day: string) =>
    all(`[data-day="${day}"] .title`).map((e) => e.textContent?.trim());
  const request = () => http.expectOne((r) => r.url === TASKS_URL);

  function flush(tasks = TASKS): void {
    request().flush(tasksResponse(tasks));
    fixture.detectChanges();
  }

  const TASKS = [
    dashboardTask({ taskId: 1, title: 'Lab report', status: 'current', dueDate: '2026-11-05' }),
    dashboardTask({ taskId: 2, title: 'Reply to email', dueDate: '2026-11-06' }),
    dashboardTask({ taskId: 3, title: 'Plan trip', dueDate: '2026-11-12' }),
    dashboardTask({
      taskId: 4,
      title: 'Standup',
      status: 'current',
      dueDate: '2026-11-05',
      dueTime: '08:30:00',
    }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CurrentUpcomingTasks);
    fixture.componentRef.setInput('today', TODAY);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('asks for current and upcoming tasks in due-date order', () => {
    const req = request();

    expect(req.request.params.get('statuses')).toBe('current,upcoming');
    expect(req.request.params.get('sortBy')).toBe('dueDate');
    expect(req.request.params.get('groupBy')).toBe('none');
    req.flush(tasksResponse([]));
  });

  it('shows a loading message until the tasks arrive', () => {
    expect(text('h2')).toBe('Current & upcoming');
    expect(text('[role="status"]')).toBe('Loading tasks…');
    expect(el('.total')).toBeNull();

    flush();

    expect(el('[role="status"]')).toBeNull();
  });

  it('splits the tasks into Today, Tomorrow and Later', () => {
    flush();

    expect(all('app-task-group h3').map((e) => e.textContent)).toEqual([
      'Today',
      'Tomorrow',
      'Later',
    ]);
    expect(titlesIn('today')).toEqual(['Standup', 'Lab report']);
    expect(titlesIn('tomorrow')).toEqual(['Reply to email']);
    expect(titlesIn('later')).toEqual(['Plan trip']);
    expect(text('.total')).toBe('4 tasks');
  });

  it('keeps an empty day with its own message while others have tasks', () => {
    flush([TASKS[2]]);

    expect(text('[data-day="today"] .empty')).toBe('Nothing due today.');
    expect(text('[data-day="tomorrow"] .empty')).toBe('Nothing due tomorrow.');
    expect(titlesIn('later')).toEqual(['Plan trip']);
    expect(text('.total')).toBe('1 task');
  });

  it('says the user is caught up when nothing is due', () => {
    flush([]);

    expect(el('app-task-group')).toBeNull();
    expect(text('.empty-title')).toBe("You're all caught up.");
    expect(text('.total')).toBe('0 tasks');
  });

  it('shows a load failure with a working retry', () => {
    request().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(text('.load-error p')).toBe(
      "Couldn't load your upcoming tasks. Something went wrong. Please try again.",
    );
    expect(el('app-task-group')).toBeNull();

    el<HTMLButtonElement>('.retry')!.click();
    fixture.detectChanges();
    expect(el<HTMLButtonElement>('.retry')).toBeNull();
    expect(text('[role="status"]')).toBe('Loading tasks…');

    flush();
    expect(el('.load-error')).toBeNull();
    expect(titlesIn('today')).toEqual(['Standup', 'Lab report']);
  });

  it('keeps the last tasks on screen while reloading and when a reload fails', () => {
    flush();

    fixture.componentInstance.reload();
    fixture.detectChanges();
    expect(el('[role="status"]')).toBeNull();
    expect(titlesIn('tomorrow')).toEqual(['Reply to email']);

    request().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(el('.load-error')).toBeTruthy();
    expect(titlesIn('tomorrow')).toEqual(['Reply to email']);
  });

  it('shows new tasks after a reload', () => {
    flush();

    fixture.componentInstance.reload();
    flush([TASKS[1]]);

    expect(titlesIn('today')).toEqual([]);
    expect(titlesIn('tomorrow')).toEqual(['Reply to email']);
  });
});
