import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toTask } from '../../../tasks/task-crud/mappers/task.mapper';
import {
  DEFAULT_UPCOMING_DAYS,
  MAX_UPCOMING_DAYS,
  type DashboardError,
  type DashboardTaskList,
  type DashboardTasksResponse,
} from '../types/dashboard.types';

/** The current time, swappable in specs so "today" is fixed. */
export const DASHBOARD_NOW = new InjectionToken<() => Date>('DASHBOARD_NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/**
 * Read-only calls for /api/dashboard, shared by the Current & Upcoming and Overdue sections.
 * The server works out "today" in the user's timezone; the auth interceptor adds the token.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/dashboard`;

  /** Open tasks due from today through `days` days later, soonest first. */
  currentUpcoming(days: number = DEFAULT_UPCOMING_DAYS): Observable<DashboardTaskList> {
    const clamped = Math.min(Math.max(Math.trunc(days) || 1, 1), MAX_UPCOMING_DAYS);
    const params = new HttpParams().set('days', clamped);
    return this.http
      .get<DashboardTasksResponse>(`${this.baseUrl}/current-upcoming-tasks`, { params })
      .pipe(map(toTaskList));
  }

  /** Open tasks whose deadline has passed. */
  overdue(): Observable<DashboardTaskList> {
    return this.http
      .get<DashboardTasksResponse>(`${this.baseUrl}/overdue-tasks`)
      .pipe(map(toTaskList));
  }
}

/**
 * Sprint 5 servers cap the list at the user's dashboard limit and send the full count as total;
 * older servers send every task and no total.
 */
function toTaskList({ tasks, total }: DashboardTasksResponse): DashboardTaskList {
  return { tasks: tasks.map(toTask), total: Math.max(total ?? 0, tasks.length) };
}

/** Turns a failed dashboard request into a message for the page. */
export function mapDashboardError(error: unknown): DashboardError {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return { message: 'Your session has ended. Please log in again.' };
  }
  return { message: "We couldn't load your tasks. Please try again." };
}
