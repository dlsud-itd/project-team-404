import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { asApiTask } from '../../../tasks/shared/testing/api-task';
import type { Task } from '../../../tasks/shared/types/task.types';
import { DashboardService, mapDashboardError } from './dashboard.service';

const URL = `${environment.apiBaseUrl}/api/dashboard`;
const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 1,
  title: 'Study ILT Module 4',
  description: null,
  dueDate: '2026-11-06',
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

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('currentUpcoming', () => {
    it('asks for the next 7 days by default and maps the tasks', () => {
      let result: Task[] | undefined;
      service.currentUpcoming().subscribe((tasks) => (result = tasks));

      const req = http.expectOne(`${URL}/current-upcoming-tasks?days=7`);
      expect(req.request.method).toBe('GET');
      req.flush({ tasks: [asApiTask(STUDY)] });

      expect(result).toEqual([STUDY]);
    });

    it('sends the day count it is given', () => {
      service.currentUpcoming(14).subscribe();
      http.expectOne(`${URL}/current-upcoming-tasks?days=14`).flush({ tasks: [] });
    });

    it('keeps the day count within what the API accepts', () => {
      service.currentUpcoming(0).subscribe();
      http.expectOne(`${URL}/current-upcoming-tasks?days=1`).flush({ tasks: [] });

      service.currentUpcoming(90).subscribe();
      http.expectOne(`${URL}/current-upcoming-tasks?days=30`).flush({ tasks: [] });
    });

    it('passes errors through', () => {
      let failure: unknown;
      service.currentUpcoming().subscribe({ error: (error: unknown) => (failure = error) });

      http
        .expectOne(`${URL}/current-upcoming-tasks?days=7`)
        .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(failure).toBeInstanceOf(HttpErrorResponse);
    });
  });

  describe('overdue', () => {
    it('gets the overdue tasks and maps them', () => {
      let result: Task[] | undefined;
      service.overdue().subscribe((tasks) => (result = tasks));

      const req = http.expectOne(`${URL}/overdue-tasks`);
      expect(req.request.method).toBe('GET');
      req.flush({ tasks: [asApiTask(STUDY)] });

      expect(result).toEqual([STUDY]);
    });
  });

  describe('mapDashboardError', () => {
    it('tells the user when their session has ended', () => {
      const error = new HttpErrorResponse({ status: 401 });
      expect(mapDashboardError(error).message).toMatch(/session has ended/);
    });

    it('gives a generic message for anything else', () => {
      expect(mapDashboardError(new HttpErrorResponse({ status: 500 })).message).toMatch(
        /couldn't load/,
      );
      expect(mapDashboardError(new Error('offline')).message).toMatch(/couldn't load/);
    });
  });
});
