import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  DashboardSummary,
  DashboardTask,
  DashboardTaskQuery,
  DashboardTasksResponse,
  ScheduleStatus,
} from '../types/dashboard.types';

const GENERIC = 'Something went wrong. Please try again.';

/** A message for a failed dashboard request. */
export function dashboardErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return 'Your session has ended. Please log in again.';
  }
  return GENERIC;
}

/** The query as HTTP params: lists comma-separated, and anything left out not sent at all. */
function toParams(query: DashboardTaskQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query) as [string, unknown][]) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length) params = params.set(key, value.join(','));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Read-only calls for the Task Dashboard (API spec VI): the counts behind the summary, and the
 * task lists of every dashboard section (Current & upcoming, Overdue, …).
 * The auth interceptor adds the token and handles expired sessions.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/dashboard`;

  /** GET /api/dashboard: how many tasks are current, upcoming, overdue and completed. */
  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.baseUrl);
  }

  /** GET /api/dashboard/tasks with any view options and filters. */
  tasks(query: DashboardTaskQuery = {}): Observable<DashboardTasksResponse> {
    return this.http.get<DashboardTasksResponse>(`${this.baseUrl}/tasks`, {
      params: toParams(query),
    });
  }

  /**
   * The tasks with any of these statuses as one list, ungrouped and in due-date order, e.g.
   * ['overdue'] for the Overdue section. `query` can narrow or re-sort it further.
   */
  tasksByStatus(
    statuses: readonly ScheduleStatus[],
    query: Omit<DashboardTaskQuery, 'statuses' | 'groupBy'> = {},
  ): Observable<DashboardTask[]> {
    return this.tasks({ sortBy: 'dueDate', ...query, statuses, groupBy: 'none' }).pipe(
      map(({ groups }) => groups.flatMap((g) => g.tasks)),
    );
  }
}
