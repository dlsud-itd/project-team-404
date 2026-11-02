import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { TasksStore } from '../../shared/state/tasks.store';
import { asApiTask } from '../../shared/testing/api-task';
import type { Task } from '../../shared/types/task.types';
import { TaskSchedulingService } from './task-scheduling.service';

const URL = `${environment.apiBaseUrl}/api/tasks/1`;
const DEADLINE = '2026-10-05T15:59:59.999Z';
const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Study ILT Module 4',
  description: null,
  dueDate: '2026-10-02',
  deadline: null,
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};

describe('TaskSchedulingService', () => {
  let service: TaskSchedulingService;
  let store: TasksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskSchedulingService);
    store = TestBed.inject(TasksStore);
    http = TestBed.inject(HttpTestingController);
    store.setTasks(10, [STUDY]);
  });

  afterEach(() => http.verify());

  it('sets the due date and stores the task the server returns', () => {
    let result: Task | undefined;
    service.setDueDate(1, '2026-10-09').subscribe((task) => (result = task));

    const req = http.expectOne(`${URL}/due-date`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ dueDate: '2026-10-09' });
    req.flush(asApiTask({ ...STUDY, dueDate: '2026-10-09' }));

    expect(result?.dueDate).toBe('2026-10-09');
    expect(store.byId(1)?.dueDate).toBe('2026-10-09');
  });

  it('sets the deadline', () => {
    service.setDeadline(1, DEADLINE).subscribe();

    const req = http.expectOne(`${URL}/deadline`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ deadline: DEADLINE });
    req.flush(asApiTask({ ...STUDY, deadline: DEADLINE }));

    expect(store.byId(1)?.deadline).toBe(DEADLINE);
  });

  it('sets the recurrence', () => {
    service.setRecurrence(1, 'weekly').subscribe();

    const req = http.expectOne(`${URL}/recurrence`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ recurrence: 'weekly' });
    req.flush(asApiTask({ ...STUDY, recurrence: 'weekly' }));

    expect(store.byId(1)).toMatchObject({ recurrence: 'weekly', isRecurring: true });
  });

  it('sends null to clear a date', () => {
    service.setDueDate(1, null).subscribe();

    const req = http.expectOne(`${URL}/due-date`);
    expect(req.request.body).toEqual({ dueDate: null });
    req.flush(asApiTask({ ...STUDY, dueDate: null }));
  });

  describe('save', () => {
    it('sends each change in turn and finishes after the last', () => {
      let done = false;
      service
        .save(1, { dueDate: '2026-10-09', deadline: DEADLINE, recurrence: 'daily' })
        .subscribe(() => (done = true));

      http.expectNone(`${URL}/deadline`);
      http.expectOne(`${URL}/due-date`).flush(asApiTask(STUDY));
      http.expectNone(`${URL}/recurrence`);
      http.expectOne(`${URL}/deadline`).flush(asApiTask(STUDY));
      expect(done).toBe(false);
      http.expectOne(`${URL}/recurrence`).flush(asApiTask(STUDY));

      expect(done).toBe(true);
    });

    it('sends only what changed, and includes a value being cleared', () => {
      service.save(1, { deadline: null }).subscribe();

      expect(http.expectOne(`${URL}/deadline`).request.body).toEqual({ deadline: null });
      http.expectNone(`${URL}/due-date`);
      http.expectNone(`${URL}/recurrence`);
    });

    it('finishes at once when nothing changed', () => {
      let done = false;
      service.save(1, {}).subscribe(() => (done = true));

      expect(done).toBe(true);
    });

    it('stops at a failure and keeps what already saved', () => {
      let failed = false;
      service
        .save(1, { dueDate: '2026-10-09', deadline: DEADLINE })
        .subscribe({ error: () => (failed = true) });

      http.expectOne(`${URL}/due-date`).flush(asApiTask({ ...STUDY, dueDate: '2026-10-09' }));
      http
        .expectOne(`${URL}/deadline`)
        .flush({ error: 'Invalid deadline' }, { status: 400, statusText: 'Bad Request' });

      expect(failed).toBe(true);
      expect(store.byId(1)).toMatchObject({ dueDate: '2026-10-09', deadline: null });
    });
  });
});
