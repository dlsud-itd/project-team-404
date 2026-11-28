import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
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
  scheduledDate: null,
  dueDate: '2026-10-02',
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
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
  const toastList = () =>
    TestBed.inject(ToastService)
      .toasts()
      .map((t) => [t.kind, t.message]);

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

    it('sends task filters and sorting, preserving the returned order', () => {
      let result: Task[] | undefined;
      service
        .list({
          projectId: 10,
          priority: 'high',
          labelId: 3,
          orderBy: 'title',
          orderDirection: 'desc',
        })
        .subscribe((tasks) => (result = tasks));

      const req = http.expectOne(
        `${URL}?projectId=10&status=all&pageSize=100&priority=high&labelId=3&orderBy=title&orderDirection=desc`,
      );
      req.flush([asApiTask({ ...STUDY, taskId: 2, title: 'Zebra' }), asApiTask(STUDY)]);

      expect(result?.map((task) => task.title)).toEqual(['Zebra', 'Study ILT Module 4']);
      expect(result?.map((task) => task.sortOrder)).toEqual([0, 1]);
    });
  });

  describe('listAll', () => {
    it('loads every page without stopping at the API page size', () => {
      let result: Task[] | undefined;
      service.listAll().subscribe((tasks) => (result = tasks));

      const firstPage = Array.from({ length: 100 }, (_, index) =>
        asApiTask({ ...STUDY, taskId: index + 1 }),
      );
      http.expectOne(`${URL}?status=all&pageSize=100&page=1`).flush(firstPage);
      http.expectOne(`${URL}?status=all&pageSize=100&page=2`).flush([asApiTask(DOCS)]);

      expect(result).toHaveLength(101);
      expect(result?.[0].taskId).toBe(1);
      expect(result?.[100]).toEqual(DOCS);
    });

    it('requests one more page when the last page is exactly full', () => {
      let result: Task[] | undefined;
      service.listAll({ projectId: 10 }).subscribe((tasks) => (result = tasks));

      const fullPage = Array.from({ length: 100 }, (_, index) =>
        asApiTask({ ...STUDY, taskId: index + 1 }),
      );
      http.expectOne(`${URL}?projectId=10&status=all&pageSize=100&page=1`).flush(fullPage);
      http.expectOne(`${URL}?projectId=10&status=all&pageSize=100&page=2`).flush([]);

      expect(result).toHaveLength(100);
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
      recurrence: 'weekly',
      recurrenceDays: [],
      recurrenceEndDate: null,
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
      recurrence: 'weekly',
      recurrenceDays: [],
      recurrenceEndDate: null,
    });
    req.flush(asApiTask(DOCS));

    expect(result).toEqual(DOCS);
    expect(store.byId(2)).toEqual(DOCS);
    expect(toastList()).toEqual([['info', 'Task “Submit documentation” created']]);
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

  it('updates completion using the backend completion fields', () => {
    store.setTasks(10, [STUDY]);
    const completedAt = '2026-10-01T10:00:00.000Z';
    service.update(1, { completedAt }).subscribe();

    const req = http.expectOne(`${URL}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isDone: true, doneAt: completedAt });
    req.flush({ taskId: 1, message: 'Task updated successfully' });

    expect(store.byId(1)?.completedAt).toBe(completedAt);
    expect(toastList()).toEqual([['success', '“Study ILT Module 4” completed']]);
  });

  it('toasts reopening, and a plain message for a task not loaded here', () => {
    store.setTasks(10, [STUDY]);
    service.update(1, { completedAt: null }).subscribe();
    http.expectOne(`${URL}/1`).flush({ taskId: 1, message: 'Task updated successfully' });

    service.announceCompletion({ taskId: 99, completedAt: '2026-10-01T10:00:00.000Z' });

    expect(toastList()).toEqual([
      ['neutral', '“Study ILT Module 4” marked not done'],
      ['success', 'Task completed'],
    ]);
  });

  it('does not toast a detail update that is not a completion', () => {
    store.setTasks(10, [STUDY]);
    service.update(1, { title: 'Renamed' }).subscribe();
    http.expectOne(`${URL}/1`).flush({ taskId: 1, message: 'Task updated successfully' });

    expect(toastList()).toEqual([]);
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
      // One toast for the whole edit, not one per request.
      expect(toastList()).toEqual([['neutral', 'Changes to “Study” saved']]);
    });

    it('skips the part with no changes', () => {
      service.save(1, { details: {}, schedule: { scheduledDate: null } }).subscribe();

      http.expectOne(`${URL}/1/schedule`).flush(asApiTask({ ...STUDY, scheduledDate: null }));
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
      expect(toastList()).toEqual([]);
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

  describe('reorder', () => {
    const CHAPTER: Task = { ...STUDY, taskId: 3, title: 'Write chapter' };

    beforeEach(() =>
      store.setTasks(10, [
        { ...STUDY, sortOrder: 0 },
        { ...DOCS, sortOrder: 1 },
        { ...CHAPTER, sortOrder: 2 },
      ]),
    );

    const order = () => store.open().map((task) => task.taskId);

    it('sends the project and every open id, and shows the new order straight away', () => {
      let done = false;
      service.reorder(10, [3, 1, 2]).subscribe(() => (done = true));

      expect(order()).toEqual([3, 1, 2]);
      const req = http.expectOne(`${URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ projectId: 10, taskIds: [3, 1, 2] });
      req.flush({ projectId: 10, taskIds: [3, 1, 2] });

      expect(done).toBe(true);
      expect(order()).toEqual([3, 1, 2]);
    });

    it('puts the old order back and passes the error on when the request fails', () => {
      let failed: unknown;
      service.reorder(10, [3, 1, 2]).subscribe({ error: (error: unknown) => (failed = error) });

      http
        .expectOne(`${URL}/reorder`)
        .flush({ error: 'Task order changed' }, { status: 409, statusText: 'Conflict' });

      expect(order()).toEqual([1, 2, 3]);
      expect(failed).toBeTruthy();
    });
  });

  it('asks for position order when told to, keeping the returned order', () => {
    let result: Task[] | undefined;
    service
      .list({ projectId: 10, orderBy: 'position', orderDirection: 'asc' })
      .subscribe((tasks) => (result = tasks));

    http
      .expectOne(`${URL}?projectId=10&${LIST_QUERY}&orderBy=position&orderDirection=asc`)
      .flush([asApiTask(DOCS), asApiTask(STUDY)]);

    expect(result?.map((task) => [task.taskId, task.sortOrder])).toEqual([
      [2, 0],
      [1, 1],
    ]);
  });
});
