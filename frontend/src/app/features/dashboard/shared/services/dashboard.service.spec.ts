import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { dashboardTask, tasksResponse } from '../../testing/helpers/dashboard-task';
import type {
  DashboardSummary,
  DashboardTask,
  DashboardTasksResponse,
} from '../types/dashboard.types';
import { DashboardService, dashboardErrorMessage } from './dashboard.service';

const URL = `${environment.apiBaseUrl}/api/dashboard`;
const TASKS_URL = `${URL}/tasks`;

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  const tasksRequest = () => http.expectOne((r) => r.url === TASKS_URL);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('summary', () => {
    it('GETs /api/dashboard', () => {
      const counts: DashboardSummary = {
        currentCount: 2,
        upcomingCount: 5,
        overdueCount: 1,
        completedCount: 12,
      };
      let result: DashboardSummary | undefined;
      service.summary().subscribe((s) => (result = s));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      req.flush(counts);

      expect(result).toEqual(counts);
    });
  });

  describe('tasks', () => {
    it('sends no params when no options are given', () => {
      service.tasks().subscribe();

      const req = tasksRequest();
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush(tasksResponse([]));
    });

    it('sends view options as given and lists comma-separated', () => {
      service
        .tasks({
          layout: 'board',
          sortBy: 'priority',
          sortDirection: 'DESC',
          groupBy: 'project',
          groupDirection: 'ASC',
          projectIds: [10, 11],
          priorityIds: [1],
          labelIds: [3, 5],
          statuses: ['current', 'overdue'],
          dueFrom: '2026-11-01',
          dueTo: '2026-11-30',
        })
        .subscribe();

      const params = tasksRequest().request.params;
      expect(params.get('layout')).toBe('board');
      expect(params.get('sortBy')).toBe('priority');
      expect(params.get('sortDirection')).toBe('DESC');
      expect(params.get('groupBy')).toBe('project');
      expect(params.get('groupDirection')).toBe('ASC');
      expect(params.get('projectIds')).toBe('10,11');
      expect(params.get('priorityIds')).toBe('1');
      expect(params.get('labelIds')).toBe('3,5');
      expect(params.get('statuses')).toBe('current,overdue');
      expect(params.get('dueFrom')).toBe('2026-11-01');
      expect(params.get('dueTo')).toBe('2026-11-30');
    });

    it('leaves out empty lists and undefined options', () => {
      service.tasks({ projectIds: [], statuses: [], sortBy: undefined }).subscribe();

      expect(tasksRequest().request.params.keys()).toEqual([]);
    });

    it('returns the reply as is', () => {
      const reply = tasksResponse([dashboardTask({ taskId: 25 })]);
      let result: DashboardTasksResponse | undefined;
      service.tasks().subscribe((r) => (result = r));

      tasksRequest().flush(reply);

      expect(result).toEqual(reply);
    });
  });

  describe('tasksByStatus', () => {
    it('asks for the statuses ungrouped in due-date order', () => {
      service.tasksByStatus(['current', 'upcoming']).subscribe();

      const params = tasksRequest().request.params;
      expect(params.get('statuses')).toBe('current,upcoming');
      expect(params.get('groupBy')).toBe('none');
      expect(params.get('sortBy')).toBe('dueDate');
    });

    it('lets the caller narrow or re-sort, but not regroup', () => {
      service
        .tasksByStatus(['overdue'], {
          sortBy: 'priority',
          projectIds: [10],
          // A caller cannot get past the type, but a stray value must not win.
          ...({ groupBy: 'project', statuses: ['completed'] } as object),
        })
        .subscribe();

      const params = tasksRequest().request.params;
      expect(params.get('sortBy')).toBe('priority');
      expect(params.get('projectIds')).toBe('10');
      expect(params.get('groupBy')).toBe('none');
      expect(params.get('statuses')).toBe('overdue');
    });

    it('flattens the groups into one list, keeping their order', () => {
      const a = dashboardTask({ taskId: 1 });
      const b = dashboardTask({ taskId: 2 });
      const c = dashboardTask({ taskId: 3 });
      const reply: DashboardTasksResponse = {
        ...tasksResponse([]),
        totalCount: 3,
        groups: [
          { key: 'current', name: 'Current', taskCount: 2, tasks: [a, b] },
          { key: 'upcoming', name: 'Upcoming', taskCount: 1, tasks: [c] },
        ],
      };
      let result: DashboardTask[] | undefined;
      service.tasksByStatus(['current', 'upcoming']).subscribe((t) => (result = t));

      tasksRequest().flush(reply);

      expect(result).toEqual([a, b, c]);
    });

    it('emits an empty list when nothing matches', () => {
      let result: DashboardTask[] | undefined;
      service.tasksByStatus(['overdue']).subscribe((t) => (result = t));

      tasksRequest().flush({ ...tasksResponse([]), groups: [] });

      expect(result).toEqual([]);
    });

    it('passes a failure on', () => {
      let failed = false;
      service.tasksByStatus(['overdue']).subscribe({ error: () => (failed = true) });

      tasksRequest().flush({ error: 'Invalid sort field' }, { status: 400, statusText: 'Bad' });

      expect(failed).toBe(true);
    });
  });
});

describe('dashboardErrorMessage', () => {
  const httpError = (status: number) => new HttpErrorResponse({ status, statusText: 'Error' });

  it('explains an ended session', () => {
    expect(dashboardErrorMessage(httpError(401))).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('gives a generic message otherwise', () => {
    for (const error of [httpError(400), httpError(500), httpError(0), new Error('x')]) {
      expect(dashboardErrorMessage(error)).toBe('Something went wrong. Please try again.');
    }
  });
});
