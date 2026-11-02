import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, last, map, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toTask } from '../../task-crud/mappers/task.mapper';
import { TasksStore } from '../../shared/state/tasks.store';
import type { ApiTask, Task } from '../../shared/types/task.types';
import type { TaskRecurrence, TaskScheduleChanges } from '../types/task-scheduling.types';

/**
 * Due date, deadline and recurrence calls for /api/tasks. Each returns the whole task, which
 * replaces the one in TasksStore. Always send the field: an empty body clears the value.
 */
@Injectable({ providedIn: 'root' })
export class TaskSchedulingService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TasksStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks`;

  /** PUT /api/tasks/{id}/due-date with a YYYY-MM-DD date, or null to clear it. */
  setDueDate(taskId: number, dueDate: string | null): Observable<Task> {
    return this.put(taskId, 'due-date', { dueDate });
  }

  /** PUT /api/tasks/{id}/deadline with an ISO instant, or null to clear it. */
  setDeadline(taskId: number, deadline: string | null): Observable<Task> {
    return this.put(taskId, 'deadline', { deadline });
  }

  /** PUT /api/tasks/{id}/recurrence. */
  setRecurrence(taskId: number, recurrence: TaskRecurrence): Observable<Task> {
    return this.put(taskId, 'recurrence', { recurrence });
  }

  /** Sends each change in turn. If one fails the rest are not sent; earlier ones stay saved. */
  save(taskId: number, changes: TaskScheduleChanges): Observable<void> {
    const requests: Observable<Task>[] = [];
    const { dueDate, deadline, recurrence } = changes;
    if (dueDate !== undefined) requests.push(this.setDueDate(taskId, dueDate));
    if (deadline !== undefined) requests.push(this.setDeadline(taskId, deadline));
    if (recurrence !== undefined) requests.push(this.setRecurrence(taskId, recurrence));
    if (!requests.length) return of(undefined);
    return concat(...requests).pipe(
      last(),
      map(() => undefined),
    );
  }

  private put(taskId: number, path: string, body: object): Observable<Task> {
    return this.http.put<ApiTask>(`${this.baseUrl}/${taskId}/${path}`, body).pipe(
      map(toTask),
      tap((task) => this.store.upsert(task)),
    );
  }
}
