import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, concat, expand, last, map, of, tap, toArray } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type {
  ApiTask,
  CreateTaskRequest,
  DeleteTaskResponse,
  Task,
  TaskChanges,
  UpdateTaskRequest,
  UpdateTaskResponse,
} from '../../shared/types/task.types';
import { TaskSchedulingService } from '../../task-scheduling/services/task-scheduling.service';
import { mapTaskError } from '../mappers/task-error.mapper';
import { toCreateTaskBody, toTask, toUpdateTaskBody } from '../mappers/task.mapper';

/** The most tasks one list request can return. */
const MAX_PAGE_SIZE = 100;

export interface TaskListFilter {
  projectId?: number;
  page?: number;
  /** A priority level name, compared without case by the server. */
  priority?: string;
  labelId?: number;
  orderBy?: 'dueDate' | 'createdAt' | 'priority' | 'title';
  orderDirection?: 'asc' | 'desc';
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
  private readonly scheduling = inject(TaskSchedulingService);
  private readonly priorities = inject(PrioritiesStore);
  private readonly legacyPriority = (priorityId: number) => this.priorities.legacyName(priorityId);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks`;

  /** GET /api/tasks, open and completed, optionally limited to one project. */
  list(filter: TaskListFilter = {}): Observable<Task[]> {
    let params = new HttpParams();
    if (filter.projectId !== undefined) params = params.set('projectId', filter.projectId);
    params = params.set('status', 'all').set('pageSize', MAX_PAGE_SIZE);
    if (filter.priority) {
      // Sprint 3 servers only know the legacy single `priority` filter; custom names need `priorities`.
      const name = filter.priority.toLowerCase();
      params = ['high', 'medium', 'low'].includes(name)
        ? params.set('priority', name)
        : params.set('priorities', filter.priority);
    }
    if (filter.labelId !== undefined) params = params.set('labelId', filter.labelId);
    if (filter.orderBy) params = params.set('orderBy', filter.orderBy);
    if (filter.orderDirection) params = params.set('orderDirection', filter.orderDirection);
    if (filter.page !== undefined) params = params.set('page', filter.page);
    return this.http.get<ApiTask[]>(this.baseUrl, { params }).pipe(
      map((tasks) =>
        tasks.map((task, index) => ({
          ...toTask(task),
          ...(filter.orderBy ? { sortOrder: index } : {}),
        })),
      ),
    );
  }

  /** Loads all API pages, rather than silently truncating the list at the page-size limit. */
  listAll(filter: Omit<TaskListFilter, 'page'> = {}): Observable<Task[]> {
    return this.list({ ...filter, page: 1 }).pipe(
      expand((tasks, index) =>
        tasks.length === MAX_PAGE_SIZE ? this.list({ ...filter, page: index + 2 }) : EMPTY,
      ),
      toArray(),
      map((pages) => pages.flat()),
    );
  }

  /** Loads a project's active tasks into the store, recording loading and error state there. */
  refresh(
    projectId: number,
    filter: Omit<TaskListFilter, 'projectId' | 'page'> = {},
  ): Observable<Task[]> {
    this.store.startLoading(projectId);
    return this.list({ ...filter, projectId }).pipe(
      tap({
        next: (tasks) => this.store.setTasks(projectId, tasks),
        error: (error: unknown) => this.store.fail(mapTaskError(error).message),
      }),
    );
  }

  get(taskId: number): Observable<Task> {
    return this.http.get<ApiTask>(`${this.baseUrl}/${taskId}`).pipe(
      map(toTask),
      tap((task) => this.store.upsert(task)),
    );
  }

  create(request: CreateTaskRequest): Observable<Task> {
    return this.http
      .post<ApiTask>(this.baseUrl, toCreateTaskBody(request, this.legacyPriority))
      .pipe(
        map(toTask),
        tap((task) => this.store.upsert(task)),
      );
  }

  /** PUT /api/tasks/{id} with only the changed details (title, description, priority, project). */
  update(taskId: number, changes: UpdateTaskRequest): Observable<UpdateTaskResponse> {
    return this.http
      .put<UpdateTaskResponse>(
        `${this.baseUrl}/${taskId}`,
        toUpdateTaskBody(changes, this.legacyPriority),
      )
      .pipe(tap(() => this.store.patch(taskId, changes)));
  }

  /**
   * Saves an edit form: details first, then the schedule, skipping whichever is empty. If the
   * details fail the schedule is not sent; if only the schedule fails, the details stay saved.
   */
  save(taskId: number, { details, schedule }: TaskChanges): Observable<void> {
    const requests: Observable<unknown>[] = [];
    if (Object.keys(details).length) requests.push(this.update(taskId, details));
    if (Object.keys(schedule).length) requests.push(this.scheduling.save(taskId, schedule));
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
