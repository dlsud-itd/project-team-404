import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, last, map, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TasksStore } from '../../shared/state/tasks.store';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskResponse,
  RescheduleTaskRequest,
  RescheduleTaskResponse,
  Task,
  TaskChanges,
  UpdateTaskRequest,
  UpdateTaskResponse,
} from '../../shared/types/task.types';
import { mapTaskError } from '../mappers/task-error.mapper';

export interface TaskListFilter {
  projectId?: number;
  /** true lists only archived tasks; the server's default is false. */
  archived?: boolean;
}

/**
 * Create, read, update and delete calls for /api/tasks. Successful calls also update
 * TasksStore, so every view of a project's tasks stays in step without a reload.
 * The auth interceptor adds the token and handles expired sessions.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TasksStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks`;

  /** GET /api/tasks, optionally limited to one project or to archived tasks. */
  list(filter: TaskListFilter = {}): Observable<Task[]> {
    let params = new HttpParams();
    if (filter.projectId !== undefined) params = params.set('projectId', filter.projectId);
    if (filter.archived !== undefined) params = params.set('archived', String(filter.archived));
    return this.http.get<Task[]>(this.baseUrl, { params });
  }

  /** Loads a project's active tasks into the store, recording loading and error state there. */
  refresh(projectId: number): Observable<Task[]> {
    this.store.startLoading(projectId);
    return this.list({ projectId }).pipe(
      tap({
        next: (tasks) => this.store.setTasks(projectId, tasks),
        error: (error: unknown) => this.store.fail(mapTaskError(error).message),
      }),
    );
  }

  get(taskId: number): Observable<Task> {
    return this.http
      .get<Task>(`${this.baseUrl}/${taskId}`)
      .pipe(tap((task) => this.store.upsert(task)));
  }

  /** POST /api/tasks. The reply has no labels or completion, so those get their new-task values. */
  create(request: CreateTaskRequest): Observable<Task> {
    return this.http.post<CreateTaskResponse>(this.baseUrl, request).pipe(
      map((created): Task => ({ completedAt: null, isRecurring: false, labels: [], ...created })),
      tap((task) => this.store.upsert(task)),
    );
  }

  /** PUT /api/tasks/{id} with only the changed details (title, description, priority, project). */
  update(taskId: number, changes: UpdateTaskRequest): Observable<UpdateTaskResponse> {
    return this.http
      .put<UpdateTaskResponse>(`${this.baseUrl}/${taskId}`, changes)
      .pipe(tap(() => this.store.patch(taskId, changes)));
  }

  /** PUT /api/tasks/{id}/schedule with only the changed due date, due time and deadline. */
  reschedule(taskId: number, changes: RescheduleTaskRequest): Observable<RescheduleTaskResponse> {
    return this.http
      .put<RescheduleTaskResponse>(`${this.baseUrl}/${taskId}/schedule`, changes)
      .pipe(
        tap(({ dueDate, dueTime, deadline }) =>
          this.store.patch(taskId, { dueDate, dueTime, deadline }),
        ),
      );
  }

  /**
   * Saves an edit form: details first, then the schedule, skipping whichever is empty. If the
   * details fail the schedule is not sent; if only the schedule fails, the details stay saved.
   */
  save(taskId: number, { details, schedule }: TaskChanges): Observable<void> {
    const requests: Observable<unknown>[] = [];
    if (Object.keys(details).length) requests.push(this.update(taskId, details));
    if (Object.keys(schedule).length) requests.push(this.reschedule(taskId, schedule));
    if (!requests.length) return of(undefined);
    return concat(...requests).pipe(
      last(),
      map(() => undefined),
    );
  }

  /** Soft-deletes a task, active or archived. */
  delete(taskId: number): Observable<DeleteTaskResponse> {
    return this.http
      .delete<DeleteTaskResponse>(`${this.baseUrl}/${taskId}`)
      .pipe(tap(() => this.store.remove(taskId)));
  }
}
