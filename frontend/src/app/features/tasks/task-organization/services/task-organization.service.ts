import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, last, map, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toLabel } from '../../../labels/mappers/label.mapper';
import type { ApiLabel, Label } from '../../../labels/types/label.types';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import type {
  AttachTaskLabelsRequest,
  SetTaskPriorityRequest,
  SetTaskPriorityResponse,
  TaskFilters,
  TaskLabelsResponse,
  TaskPriority,
} from '../types/task-organization.types';
import { filtersToApiQuery } from '../utils/filter-query.util';

/**
 * Priority, label and filter calls for /api/tasks. Label changes are copied into TasksStore so
 * every view of the task shows them without a reload.
 */
@Injectable({ providedIn: 'root' })
export class TaskOrganizationService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TasksStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks`;

  /**
   * GET /api/tasks narrowed by priority and label and in the chosen order, optionally within one
   * project. The list comes back in the server's order; the store is left alone.
   */
  list(filters: TaskFilters, projectId?: number): Observable<Task[]> {
    let params = new HttpParams({ fromObject: filtersToApiQuery(filters) });
    if (projectId !== undefined) params = params.set('projectId', projectId);
    return this.http.get<Task[]>(this.baseUrl, { params });
  }

  /** PUT /api/tasks/{id}/priority. Emits the priority the server saved. */
  setPriority(taskId: number, priority: TaskPriority): Observable<TaskPriority> {
    const body: SetTaskPriorityRequest = { priority };
    return this.http
      .put<SetTaskPriorityResponse>(`${this.baseUrl}/${taskId}/priority`, body)
      .pipe(map((task) => task.priority ?? priority));
  }

  /** GET /api/tasks/{id}/labels. */
  listLabels(taskId: number): Observable<Label[]> {
    return this.http.get<ApiLabel[]>(`${this.baseUrl}/${taskId}/labels`).pipe(
      map((labels) => labels.map(toLabel)),
      tap((labels) => this.store.patch(taskId, { labels })),
    );
  }

  /** POST /api/tasks/{id}/labels. Emits every label the task has afterwards. */
  attachLabels(taskId: number, labelIds: readonly number[]): Observable<Label[]> {
    const body: AttachTaskLabelsRequest = { labelIds: [...new Set(labelIds)] };
    return this.http
      .post<TaskLabelsResponse>(`${this.baseUrl}/${taskId}/labels`, body)
      .pipe(this.toTaskLabels(taskId));
  }

  /** DELETE /api/tasks/{id}/labels/{labelId}. Emits the labels the task has left. */
  detachLabel(taskId: number, labelId: number): Observable<Label[]> {
    return this.http
      .delete<TaskLabelsResponse>(`${this.baseUrl}/${taskId}/labels/${labelId}`)
      .pipe(this.toTaskLabels(taskId));
  }

  /**
   * Makes a task's labels go from `before` to `after`: one request adds the new ones, then one
   * request per label removes the dropped ones. Stops at the first failure; whatever already
   * succeeded stays saved and in the store. Emits the task's final labels.
   */
  saveLabels(
    taskId: number,
    before: readonly number[],
    after: readonly number[],
  ): Observable<Label[]> {
    const added = after.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !after.includes(id));

    const requests: Observable<Label[]>[] = [];
    if (added.length) requests.push(this.attachLabels(taskId, added));
    for (const id of removed) requests.push(this.detachLabel(taskId, id));

    if (!requests.length) return of(this.store.byId(taskId)?.labels ?? []);
    return concat(...requests).pipe(last());
  }

  private toTaskLabels(taskId: number) {
    return (source: Observable<TaskLabelsResponse>) =>
      source.pipe(
        map(({ labels }) => labels.map(toLabel)),
        tap((labels) => this.store.patch(taskId, { labels })),
      );
  }
}
