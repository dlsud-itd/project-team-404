import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { TasksStore } from '../../shared/state/tasks.store';
import { asApiTask } from '../../shared/testing/api-task';
import type { CreateTaskRequest, Task } from '../../shared/types/task.types';
import { TaskService } from './task.service';

const URL = `${environment.apiBaseUrl}/api/tasks`;
const LIST_QUERY = 'status=all&pageSize=100';
const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Study ILT Module 4',
  description: 'Read all lessons',
  dueDate: '2026-10-02',
  deadline: '2026-10-02T15:59:59.999Z',
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [{ labelId: 3, name: 'Study', color: '#2563EB' }],
};
const DOCS: Task = { ...STUDY, taskId: 2, title: 'Submit documentation', labels: [] };

describe('TaskService', () => {
  let service: TaskService;
  let store: TasksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    store = TestBed.inject(TasksStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('gets open and completed tasks, as many as one request allows', () => {
      let result: Task[] | undefined;
      service.list().subscribe((tasks) => (result = tasks));

      const req = http.expectOne(`${URL}?${LIST_QUERY}`);
      expect(req.request.method).toBe('GET');
      req.flush([asApiTask(STUDY)]);

      expect(result).toEqual([STUDY]);
    });

    it('sends the project filter', () => {
      service.list({ projectId: 10 }).subscribe();

      http.expectOne(`${URL}?projectId=10&${LIST_QUERY}`).flush([]);
    });
  });

  describe('refresh', () => {
    it("loads a project's tasks into the store", () => {
      service.refresh(10).subscribe();
      expect(store.loading()).toBe(true);
      expect(store.projectId()).toBe(10);

      http.expectOne(`${URL}?projectId=10&${LIST_QUERY}`).flush([DOCS, STUDY].map(asApiTask));

      expect(store.loading()).toBe(false);
      expect(store.tasks()).toEqual([STUDY, DOCS]);
    });

    it('records a failure in the store', () => {
      service.refresh(10).subscribe({ error: () => {} });

      http
        .expectOne(`${URL}?projectId=10&${LIST_QUERY}`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.loading()).toBe(false);
      expect(store.error()).toBe('Something went wrong. Please try again.');
    });
  });

  it('gets one task by id and keeps it in the store', () => {
    let result: Task | undefined;
    service.get(1).subscribe((task) => (result = task));

    const req = http.expectOne(`${URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(asApiTask(STUDY));

    expect(result).toEqual(STUDY);
    expect(store.byId(1)).toEqual(STUDY);
  });

  it('creates a task in the form the API accepts and stores the reply', () => {
    const request: CreateTaskRequest = {
      projectId: 10,
      priorityId: 2,
      title: 'Submit documentation',
      description: null,
      dueDate: null,
      deadline: null,
      recurrence: 'weekly',
    };
    let result: Task | undefined;
    service.create(request).subscribe((task) => (result = task));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      projectId: 10,
      priority: 'medium',
      title: 'Submit documentation',
      description: null,
      dueDate: null,
      deadline: null,
      recurrence: 'weekly',
    });
    req.flush(asApiTask(DOCS));

    expect(result).toEqual(DOCS);
    expect(store.byId(2)).toEqual(DOCS);
  });

  it('updates only the changed details and patches the store', () => {
    store.setTasks(10, [STUDY]);
    service.update(1, { title: 'Study module 5', priorityId: 1 }).subscribe();

    const req = http.expectOne(`${URL}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'Study module 5', priority: 'high' });
    req.flush({ taskId: 1, message: 'Task updated successfully' });

    expect(store.byId(1)).toEqual({ ...STUDY, title: 'Study module 5', priorityId: 1 });
  });

  it('leaves the store alone when an update fails', () => {
    store.setTasks(10, [STUDY]);
    service.update(1, { title: 'Renamed' }).subscribe({ error: () => {} });

    http
      .expectOne(`${URL}/1`)
      .flush({ error: 'Invalid updating task.' }, { status: 404, statusText: 'Not Found' });

    expect(store.byId(1)?.title).toBe('Study ILT Module 4');
  });

  describe('save', () => {
    it('sends the details, then the schedule', () => {
      store.setTasks(10, [STUDY]);
      let done = false;
      service
        .save(1, { details: { title: 'Study' }, schedule: { dueDate: '2026-10-05' } })
        .subscribe(() => (done = true));

      http.expectNone(`${URL}/1/due-date`);
      http.expectOne(`${URL}/1`).flush({ taskId: 1, message: 'Task updated successfully' });
      const req = http.expectOne(`${URL}/1/due-date`);
      expect(req.request.body).toEqual({ dueDate: '2026-10-05' });
      expect(done).toBe(false);
      req.flush(asApiTask({ ...STUDY, title: 'Study', dueDate: '2026-10-05' }));

      expect(done).toBe(true);
      expect(store.byId(1)).toMatchObject({ title: 'Study', dueDate: '2026-10-05' });
    });

    it('skips the part with no changes', () => {
      service.save(1, { details: {}, schedule: { deadline: null } }).subscribe();

      http.expectOne(`${URL}/1/deadline`).flush(asApiTask({ ...STUDY, deadline: null }));
    });

    it('does nothing when there are no changes', () => {
      let done = false;
      service.save(1, { details: {}, schedule: {} }).subscribe(() => (done = true));

      expect(done).toBe(true);
    });

    it('does not touch the schedule when the details fail', () => {
      let failed = false;
      service
        .save(1, { details: { title: 'x' }, schedule: { dueDate: null } })
        .subscribe({ error: () => (failed = true) });

      http
        .expectOne(`${URL}/1`)
        .flush({ error: 'Task title cannot be empty' }, { status: 400, statusText: 'Bad' });

      expect(failed).toBe(true);
    });
  });

  it('deletes a task and removes it from the store', () => {
    store.setTasks(10, [STUDY, DOCS]);
    service.delete(1).subscribe();

    const req = http.expectOne(`${URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Task deleted successfully' });

    expect(store.tasks()).toEqual([DOCS]);
  });
});
