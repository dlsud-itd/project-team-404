import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ERRANDS, STUDY, URGENT, apiLabel } from '../../../labels/testing/helpers/api-label';
import type { Label } from '../../../labels/types/label.types';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { DEFAULT_TASK_FILTERS, type TaskPriority } from '../types/task-organization.types';
import { TaskOrganizationService } from './task-organization.service';

const URL = `${environment.apiBaseUrl}/api/tasks`;
const TASK: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 4,
  title: 'Study ILT Module 4',
  description: null,
  dueDate: null,
  dueTime: null,
  deadline: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [STUDY],
};

describe('TaskOrganizationService', () => {
  let service: TaskOrganizationService;
  let store: TasksStore;
  let http: HttpTestingController;

  const storedLabels = () => store.byId(1)?.labels;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskOrganizationService);
    store = TestBed.inject(TasksStore);
    http = TestBed.inject(HttpTestingController);
    store.setTasks(10, [TASK]);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('GETs /api/tasks with the filters and project', () => {
      let result: Task[] | undefined;
      service
        .list({ priority: 'high', labelId: 3, orderBy: 'priority', orderDirection: 'desc' }, 10)
        .subscribe((tasks) => (result = tasks));

      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('priority')).toBe('high');
      expect(req.request.params.get('labelId')).toBe('3');
      expect(req.request.params.get('orderBy')).toBe('priority');
      expect(req.request.params.get('orderDirection')).toBe('desc');
      expect(req.request.params.get('projectId')).toBe('10');
      req.flush([TASK]);

      expect(result).toEqual([TASK]);
    });

    it('sends no params for the default filters across all projects', () => {
      service.list(DEFAULT_TASK_FILTERS).subscribe();

      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });

    it('keeps the order the server returns and leaves the store alone', () => {
      const second = { ...TASK, taskId: 2, title: 'Another' };
      let result: Task[] | undefined;
      service.list(DEFAULT_TASK_FILTERS, 10).subscribe((tasks) => (result = tasks));

      http.expectOne((r) => r.url === URL).flush([second, TASK]);

      expect(result?.map((t) => t.taskId)).toEqual([2, 1]);
      expect(store.tasks()).toEqual([TASK]);
    });
  });

  describe('setPriority', () => {
    it('PUTs the priority and emits the saved one', () => {
      let result: TaskPriority | undefined;
      service.setPriority(1, 'high').subscribe((p) => (result = p));

      const req = http.expectOne(`${URL}/1/priority`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ priority: 'high' });
      req.flush({ id: 1, priority: 'high', title: 'Study ILT Module 4' });

      expect(result).toBe('high');
    });

    it('passes a failure on', () => {
      let failed = false;
      service.setPriority(1, 'low').subscribe({ error: () => (failed = true) });

      http.expectOne(`${URL}/1/priority`).flush(null, { status: 404, statusText: 'Not Found' });

      expect(failed).toBe(true);
    });
  });

  describe('listLabels', () => {
    it('GETs the task’s labels and copies them into the store', () => {
      let result: Label[] | undefined;
      service.listLabels(1).subscribe((labels) => (result = labels));

      const req = http.expectOne(`${URL}/1/labels`);
      expect(req.request.method).toBe('GET');
      req.flush([apiLabel(STUDY), apiLabel(ERRANDS)]);

      expect(result).toEqual([STUDY, ERRANDS]);
      expect(storedLabels()).toEqual([STUDY, ERRANDS]);
    });
  });

  describe('attachLabels', () => {
    it('POSTs the ids without duplicates and stores the task’s new labels', () => {
      let result: Label[] | undefined;
      service.attachLabels(1, [5, 5, 7]).subscribe((labels) => (result = labels));

      const req = http.expectOne(`${URL}/1/labels`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ labelIds: [5, 7] });
      req.flush({ labels: [apiLabel(STUDY), apiLabel(ERRANDS), apiLabel(URGENT)] });

      expect(result).toEqual([STUDY, ERRANDS, URGENT]);
      expect(storedLabels()).toEqual([STUDY, ERRANDS, URGENT]);
    });

    it('keeps the stored labels when attaching fails', () => {
      service.attachLabels(1, [99]).subscribe({ error: () => {} });

      http.expectOne(`${URL}/1/labels`).flush(null, { status: 404, statusText: 'Not Found' });

      expect(storedLabels()).toEqual([STUDY]);
    });
  });

  describe('detachLabel', () => {
    it('DELETEs one label and stores what is left', () => {
      let result: Label[] | undefined;
      service.detachLabel(1, 3).subscribe((labels) => (result = labels));

      const req = http.expectOne(`${URL}/1/labels/3`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ labels: [] });

      expect(result).toEqual([]);
      expect(storedLabels()).toEqual([]);
    });
  });

  describe('saveLabels', () => {
    it('adds new labels in one request, then removes dropped ones one by one', () => {
      let result: Label[] | undefined;
      service.saveLabels(1, [3, 5], [5, 7]).subscribe((labels) => (result = labels));

      const attach = http.expectOne(`${URL}/1/labels`);
      expect(attach.request.body).toEqual({ labelIds: [7] });
      http.expectNone(`${URL}/1/labels/3`);
      attach.flush({ labels: [apiLabel(STUDY), apiLabel(ERRANDS), apiLabel(URGENT)] });

      http.expectOne(`${URL}/1/labels/3`).flush({ labels: [apiLabel(ERRANDS), apiLabel(URGENT)] });

      expect(result).toEqual([ERRANDS, URGENT]);
      expect(storedLabels()).toEqual([ERRANDS, URGENT]);
    });

    it('only removes when nothing was added', () => {
      service.saveLabels(1, [3], []).subscribe();

      http.expectNone({ method: 'POST', url: `${URL}/1/labels` });
      http.expectOne(`${URL}/1/labels/3`).flush({ labels: [] });
    });

    it('makes no request when nothing changed and emits the stored labels', () => {
      let result: Label[] | undefined;
      service.saveLabels(1, [3], [3]).subscribe((labels) => (result = labels));

      expect(result).toEqual([STUDY]);
    });

    it('emits no labels for an unchanged task the store does not have', () => {
      let result: Label[] | undefined;
      service.saveLabels(99, [], []).subscribe((labels) => (result = labels));

      expect(result).toEqual([]);
    });

    it('stops at the first failure and keeps what was already saved', () => {
      let failed = false;
      service.saveLabels(1, [3, 5], [7]).subscribe({ error: () => (failed = true) });

      http.expectOne(`${URL}/1/labels`).flush({
        labels: [apiLabel(STUDY), apiLabel(ERRANDS), apiLabel(URGENT)],
      });
      http.expectOne(`${URL}/1/labels/3`).flush(null, { status: 500, statusText: 'Error' });

      expect(failed).toBe(true);
      http.expectNone(`${URL}/1/labels/5`);
      expect(storedLabels()).toEqual([STUDY, ERRANDS, URGENT]);
    });
  });
});
