import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import type { Project } from '../../projects/shared/types/project.types';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import type { Task } from '../../tasks/shared/types/task.types';
import type { ApiArchiveResponse } from '../types/archive.types';
import { ArchiveService, type LabelArchiveChange } from './archive.service';

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

const TASK: Task = {
  taskId: 9,
  projectId: 5,
  priorityId: 2,
  title: 'Buy milk',
  description: null,
  scheduledDate: null,
  dueDate: null,
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

function response(overrides: Partial<ApiArchiveResponse> = {}): ApiArchiveResponse {
  return {
    tasks: {
      items: [{ id: 9, title: 'Buy milk', projectId: 5, archivedAt: '2026-11-20T10:00:00.000Z' }],
      total: 4,
    },
    projects: {
      items: [{ id: 7, name: 'Old', color: '#ff0000', archivedAt: '2026-11-21T09:00:00.000Z' }],
      total: 1,
    },
    labels: {
      items: [
        {
          id: 3,
          name: 'Work',
          color: null,
          taskCount: 2,
          archivedAt: '2026-11-20T10:00:00.000Z',
        },
      ],
      total: 2,
    },
    nextCursor: 'abc',
    ...overrides,
  };
}

describe('ArchiveService', () => {
  let service: ArchiveService;
  let http: HttpTestingController;
  let tasks: TasksStore;
  let projects: ProjectsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ArchiveService);
    http = TestBed.inject(HttpTestingController);
    tasks = TestBed.inject(TasksStore);
    projects = TestBed.inject(ProjectsStore);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('asks for a tab with the page size, and the cursor when given', () => {
      service.list('tasks', 'next-page', 10).subscribe();
      const req = http.expectOne((r) => r.url === `${API}/archive`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('type')).toBe('tasks');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('cursor')).toBe('next-page');
      req.flush(response());
    });

    it('leaves the cursor out on the first page and defaults to 20 items', () => {
      service.list('all').subscribe();
      const req = http.expectOne((r) => r.url === `${API}/archive`);
      expect(req.request.params.has('cursor')).toBe(false);
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(response());
    });

    it('flattens the groups newest first, tasks before labels at the same instant', () => {
      projects.setProjects([PROJECT]);
      let items: unknown[] = [];
      let counts: unknown;
      let cursor: string | null = null;
      service.list('all').subscribe((page) => {
        items = page.items;
        counts = page.counts;
        cursor = page.nextCursor;
      });
      http.expectOne((r) => r.url === `${API}/archive`).flush(response());

      expect(items).toEqual([
        {
          kind: 'project',
          id: 7,
          name: 'Old',
          archivedAt: '2026-11-21T09:00:00.000Z',
          color: '#ff0000',
        },
        {
          kind: 'task',
          id: 9,
          name: 'Buy milk',
          archivedAt: '2026-11-20T10:00:00.000Z',
          projectId: 5,
          projectName: 'Home',
          color: '#2563EB',
        },
        {
          kind: 'label',
          id: 3,
          name: 'Work',
          archivedAt: '2026-11-20T10:00:00.000Z',
          color: null,
          taskCount: 2,
        },
      ]);
      expect(counts).toEqual({ all: 7, tasks: 4, projects: 1, labels: 2, priorities: 0 });
      expect(cursor).toBe('abc');
    });
  });

  describe('archive and restore', () => {
    it('archives a task and drops it from the active list', () => {
      tasks.setTasks(5, [TASK]);
      service.archive('task', 9).subscribe();
      const req = http.expectOne(`${API}/tasks/9/archive`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ taskId: 9, isArchived: true, archivedAt: '2026-11-21T00:00:00.000Z' });

      expect(tasks.tasks()).toEqual([]);
      expect(tasks.byId(9)?.isArchived).toBe(true);
    });

    it('restores a project through the store', () => {
      projects.setProjects([{ ...PROJECT, isArchived: true }]);
      service.restore('project', 5).subscribe();
      const req = http.expectOne(`${API}/projects/5/archive`);
      expect(req.request.body).toEqual({ isArchived: false });
      req.flush({ projectId: 5, isArchived: false, message: 'Project restored from archive' });

      expect(projects.active().map((p) => p.projectId)).toEqual([5]);
    });

    it('restores a project the store does not know with a plain request', () => {
      service.restore('project', 42).subscribe();
      http
        .expectOne(`${API}/projects/42/archive`)
        .flush({ projectId: 42, isArchived: false, message: 'Project restored from archive' });
    });

    it('archives a label and tells label lists', () => {
      const changes: LabelArchiveChange[] = [];
      service.labelArchiveChanges.subscribe((change) => changes.push(change));
      service.archive('label', 3).subscribe();
      const req = http.expectOne(`${API}/labels/3/archive`);
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ id: 3, name: 'Work', color: null, isArchived: true });

      expect(changes).toEqual([{ labelId: 3, isArchived: true }]);
    });

    it('leaves the stores alone when the request fails', () => {
      tasks.setTasks(5, [TASK]);
      let failed = false;
      service.archive('task', 9).subscribe({ error: () => (failed = true) });
      http
        .expectOne(`${API}/tasks/9/archive`)
        .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(failed).toBe(true);
      expect(tasks.tasks().map((t) => t.taskId)).toEqual([9]);
    });
  });

  describe('deletePermanently', () => {
    it('deletes each kind at its own endpoint', () => {
      tasks.setTasks(5, [TASK]);
      projects.setProjects([PROJECT]);
      const changes: LabelArchiveChange[] = [];
      service.labelArchiveChanges.subscribe((change) => changes.push(change));

      service.deletePermanently('task', 9).subscribe();
      service.deletePermanently('project', 5).subscribe();
      service.deletePermanently('label', 3).subscribe();

      for (const url of [`${API}/tasks/9`, `${API}/projects/5`, `${API}/labels/3`]) {
        const req = http.expectOne(url);
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 204, statusText: 'No Content' });
      }

      expect(tasks.byId(9)).toBeUndefined();
      expect(projects.byId(5)).toBeUndefined();
      expect(changes).toEqual([{ labelId: 3, isArchived: true, deleted: true }]);
    });
  });
});
