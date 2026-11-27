import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  concat,
  expand,
  last,
  map,
  of,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type {
  ApiTask,
  CreateTaskRequest,
  DeleteTaskResponse,
  Task,
  TaskChanges,
  TaskCompletion,
  UpdateTaskRequest,
  UpdateTaskResponse,
} from '../../shared/types/task.types';
import type {
  LabelMatch,
  SortDirection,
  TaskSortField,
  TaskStatusFilter,
} from '../../task-organization/types/task-query.types';
import { TaskSchedulingService } from '../../task-scheduling/services/task-scheduling.service';
import { mapTaskError } from '../mappers/task-error.mapper';
import { toCreateTaskBody, toTask, toUpdateTaskBody } from '../mappers/task.mapper';

/** The most tasks one list request can return. */
/** The most tasks one GET /api/tasks page returns; a list this long may be missing some. */
export const MAX_PAGE_SIZE = 100;

/** Sprint 3 servers only know these names, and only through the single `priority` filter. */
const LEGACY_PRIORITY_NAMES = ['high', 'medium', 'low'];

export interface TaskListFilter {
  projectId?: number;
  page?: number;
  /** A priority level name, compared without case by the server. */
  priority?: string;
  /** Priority level names; a task matches any of them. */
  priorities?: string[];
  labelId?: number;
  labelIds?: number[];
  /** Whether a task needs any (the default) or all of labelIds. */
  labelMatch?: LabelMatch;
  /** Inclusive YYYY-MM-DD bounds on the due date. */
  dueFrom?: string;
  dueTo?: string;
  hasDueDate?: boolean;
  /** Open tasks due before today in the user's timezone. */
  overdue?: boolean;
  recurring?: boolean;
  /** Defaults to 'all'. */
  status?: TaskStatusFilter;
  /** 'position' is the project's own order, set by drag and drop; it is not a Sort menu choice. */
  orderBy?: TaskSortField | 'position';
  orderDirection?: SortDirection;
}

/**
 * Adds the Sprint 5 filters (priorities, labels, due date, repeat) to a request's params.
 * Shared by the task list and the board, which accept the same filters.
 */
export function appendTaskFilters(params: HttpParams, filter: TaskListFilter): HttpParams {
  const priorities = filter.priorities ?? (filter.priority ? [filter.priority] : []);
  if (priorities.length === 1 && LEGACY_PRIORITY_NAMES.includes(priorities[0].toLowerCase())) {
    // One built-in level goes through the legacy filter, which Sprint 3 servers also understand.
    params = params.set('priority', priorities[0].toLowerCase());
  } else if (priorities.length) {
    params = params.set('priorities', priorities.join(','));
  }
  const labelIds = filter.labelIds ?? (filter.labelId !== undefined ? [filter.labelId] : []);
  if (labelIds.length === 1) params = params.set('labelId', labelIds[0]);
  else if (labelIds.length) params = params.set('labelIds', labelIds.join(','));
  if (filter.labelMatch) params = params.set('labelMatch', filter.labelMatch);
  if (filter.dueFrom) params = params.set('dueFrom', filter.dueFrom);
  if (filter.dueTo) params = params.set('dueTo', filter.dueTo);
  if (filter.hasDueDate !== undefined) params = params.set('hasDueDate', filter.hasDueDate);
  if (filter.overdue) params = params.set('overdue', true);
  if (filter.recurring !== undefined) params = params.set('recurring', filter.recurring);
  return params;
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
  private readonly toast = inject(ToastService);
  private readonly completed = new Subject<TaskCompletion>();

  /** Each saved completion or reopening, wherever in the app it was made. */
  readonly completions: Observable<TaskCompletion> = this.completed.asObservable();

  /**
   * Tells the rest of the app about a completion saved elsewhere, such as a task dragged into
   * the board's Done column, so streaks and the dashboard refresh as they do for the checkbox.
   */
  announceCompletion(completion: TaskCompletion): void {
    this.completed.next(completion);
    this.toastCompletion(completion);
  }

  /** GET /api/tasks, open and completed, optionally limited to one project. */
  list(filter: TaskListFilter = {}): Observable<Task[]> {
    let params = new HttpParams();
    if (filter.projectId !== undefined) params = params.set('projectId', filter.projectId);
    params = params.set('status', filter.status ?? 'all').set('pageSize', MAX_PAGE_SIZE);
    params = appendTaskFilters(params, filter);
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
        tap((task) => {
          this.store.upsert(task);
          this.toast.info(`Task “${task.title}” created`);
        }),
      );
  }

  /** PUT /api/tasks/{id} with only the changed details (title, description, priority, project). */
  update(taskId: number, changes: UpdateTaskRequest): Observable<UpdateTaskResponse> {
    return this.http
      .put<UpdateTaskResponse>(
        `${this.baseUrl}/${taskId}`,
        toUpdateTaskBody(changes, this.legacyPriority),
      )
      .pipe(
        tap(() => {
          this.store.patch(taskId, changes);
          if (changes.completedAt !== undefined) {
            const completion = { taskId, completedAt: changes.completedAt };
            this.completed.next(completion);
            this.toastCompletion(completion);
          }
        }),
      );
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
      tap(() => {
        const title = details.title ?? this.store.byId(taskId)?.title;
        this.toast.neutral(title ? `Changes to “${title}” saved` : 'Task changes saved');
      }),
    );
  }

  /**
   * PUT /api/tasks/reorder. `taskIds` must be every open task of the project, in the new order.
   * The store shows the new order straight away and is put back if the request fails.
   */
  reorder(projectId: number, taskIds: number[]): Observable<void> {
    const previous = taskIds.map((taskId) => [taskId, this.store.byId(taskId)?.sortOrder] as const);
    taskIds.forEach((taskId, sortOrder) => this.store.patch(taskId, { sortOrder }));

    return this.http.put(`${this.baseUrl}/reorder`, { projectId, taskIds }).pipe(
      map(() => undefined),
      catchError((error: unknown) => {
        for (const [taskId, sortOrder] of previous) {
          if (sortOrder !== undefined) this.store.patch(taskId, { sortOrder });
        }
        return throwError(() => error);
      }),
    );
  }

  /** Green toast for a completion, grey for reopening; generic when the task isn't loaded here. */
  private toastCompletion({ taskId, completedAt }: TaskCompletion): void {
    const title = this.store.byId(taskId)?.title;
    if (completedAt) {
      this.toast.success(title ? `“${title}” completed` : 'Task completed');
    } else {
      this.toast.neutral(title ? `“${title}” marked not done` : 'Task reopened');
    }
  }

  /** Soft-deletes a task, active or archived. */
  delete(taskId: number): Observable<DeleteTaskResponse> {
    return this.http
      .delete<DeleteTaskResponse>(`${this.baseUrl}/${taskId}`)
      .pipe(tap(() => this.store.remove(taskId)));
  }
}
