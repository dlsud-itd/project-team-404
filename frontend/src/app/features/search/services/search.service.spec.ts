import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import type { Project } from '../../projects/shared/types/project.types';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import type { Task } from '../../tasks/shared/types/task.types';
import type { ApiSearchResponse, SearchResults } from '../types/search.types';
import { SearchService, isSearchable } from './search.service';

const API = `${environment.apiBaseUrl}/api`;

const PROJECT: Project = {
  projectId: 5,
  name: 'Home',
  description: null,
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
};

const INBOX: Project = { ...PROJECT, projectId: 1, name: 'Inbox', color: null, isInbox: true };

const TASK: Task = {
  taskId: 9,
  projectId: 5,
  priorityId: 1,
  title: 'Buy milk',
  description: null,
  scheduledDate: null,
  dueDate: '2026-11-24',
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

function response(overrides: Partial<ApiSearchResponse> = {}): ApiSearchResponse {
  return {
    tasks: {
      items: [
        {
          id: 9,
          title: 'Buy milk',
          projectId: 5,
          matchedField: 'title',
          snippet: 'Buy milk',
          isArchived: false,
          archivedAt: null,
        },
        {
          id: 12,
          title: 'Groceries',
          projectId: 77,
          matchedField: 'description',
          snippet: '…oat milk and bread',
          isArchived: true,
          archivedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      total: 4,
    },
    projects: {
      items: [
        {
          id: 5,
          name: 'Home',
          matchedField: 'description',
          snippet: 'milk run',
          isArchived: false,
          archivedAt: null,
        },
      ],
      total: 1,
    },
    ...overrides,
  };
}

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;
  let projects: ProjectsStore;
  let tasks: TasksStore;

  const expectSearch = () => http.expectOne((r) => r.url === `${API}/search`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
    projects = TestBed.inject(ProjectsStore);
    tasks = TestBed.inject(TasksStore);
  });

  afterEach(() => http.verify());

  describe('search', () => {
    beforeEach(() => projects.setProjects([INBOX, PROJECT]));

    it('sends the trimmed query with type, limit and the archived flag', () => {
      service.search('  milk ', { type: 'tasks', limit: 20, includeArchived: true }).subscribe();
      const req = expectSearch();
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('milk');
      expect(req.request.params.get('type')).toBe('tasks');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('includeArchived')).toBe('true');
      req.flush(response());
    });

    it('defaults to all types, 5 results and no archived items', () => {
      service.search('milk').subscribe();
      const req = expectSearch();
      expect(req.request.params.get('type')).toBe('all');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('includeArchived')).toBe('false');
      req.flush(response());
    });

    it('cuts the query to the 100 characters the server accepts', () => {
      service.search('x'.repeat(150)).subscribe();
      const req = expectSearch();
      expect(req.request.params.get('q')).toHaveLength(100);
      req.flush(response());
    });

    it('keeps the items and the server totals', () => {
      let results: SearchResults | undefined;
      service.search('milk').subscribe((r) => (results = r));
      expectSearch().flush(response());
      expect(results?.query).toBe('milk');
      expect(results?.tasks.map((t) => t.id)).toEqual([9, 12]);
      expect(results?.projects.map((p) => p.id)).toEqual([5]);
      expect(results?.counts).toEqual({ tasks: 4, projects: 1 });
    });

    it('passes errors on', () => {
      let failed = false;
      service.search('milk').subscribe({ error: () => (failed = true) });
      expectSearch().flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
      expect(failed).toBe(true);
    });
  });

  it('loads projects once when the store is empty, so rows can show project names', () => {
    service.search('milk').subscribe();
    const projectRequests = http.match((r) => r.url === `${API}/projects`);
    expect(projectRequests).toHaveLength(2);
    projectRequests.forEach((req) => req.flush([]));
    expectSearch().flush(response());

    service.search('milk').subscribe();
    expect(http.match((r) => r.url === `${API}/projects`)).toHaveLength(0);
    expectSearch().flush(response());
  });

  describe('toRows', () => {
    let results: SearchResults;

    beforeEach(() => {
      projects.setProjects([INBOX, PROJECT]);
      service.search('milk').subscribe((r) => (results = r));
      expectSearch().flush(response());
    });

    it('fills in project name and color, and the priority and due date of loaded tasks', () => {
      tasks.setTasks(5, [TASK]);
      const [task] = service.toRows(results).tasks;
      expect(task).toMatchObject({
        kind: 'task',
        title: 'Buy milk',
        projectName: 'Home',
        projectColor: '#2563EB',
        priorityName: 'High',
        priorityColor: '#D84A4A',
        dueDate: '2026-11-24',
        inDescription: false,
      });
    });

    it('leaves out what the stores do not know', () => {
      const [, other] = service.toRows(results).tasks;
      expect(other).toMatchObject({
        projectName: null,
        projectColor: null,
        priorityName: null,
        priorityColor: null,
        dueDate: null,
        inDescription: true,
        snippet: '…oat milk and bread',
        isArchived: true,
      });
    });

    it('marks project matches in the description and takes the color from the store', () => {
      expect(service.toRows(results).projects[0]).toEqual({
        kind: 'project',
        id: 5,
        name: 'Home',
        color: '#2563EB',
        inDescription: true,
        snippet: 'milk run',
        isArchived: false,
      });
    });
  });

  describe('open', () => {
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      projects.setProjects([INBOX, PROJECT]);
    });

    it('opens a task in its project', () => {
      void service.open({ kind: 'task', id: 9, projectId: 5 } as never);
      expect(navigate).toHaveBeenCalledWith(['/projects', 5, 'tasks', 9, 'edit']);
    });

    it('opens a task without a project in the Inbox', () => {
      void service.open({ kind: 'task', id: 9, projectId: null } as never);
      expect(navigate).toHaveBeenCalledWith(['/projects', 1, 'tasks', 9, 'edit']);
    });

    it('opens a project on its task list', () => {
      void service.open({ kind: 'project', id: 5 } as never);
      expect(navigate).toHaveBeenCalledWith(['/projects', 5, 'tasks']);
    });
  });

  it('needs at least two characters to search', () => {
    expect(isSearchable('a')).toBe(false);
    expect(isSearchable(' a ')).toBe(false);
    expect(isSearchable('ab')).toBe(true);
  });
});
