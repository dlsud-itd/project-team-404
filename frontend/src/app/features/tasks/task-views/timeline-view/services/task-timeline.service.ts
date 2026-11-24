import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { appendTaskFilters } from '../../../task-crud/services/task.service';
import type { ApiTimeline, TimelineRequest, TimelineWindow } from '../types/task-timeline.types';

/** GET /api/tasks/timeline: the dated tasks that cross a window, as bars grouped by project. */
@Injectable({ providedIn: 'root' })
export class TaskTimelineService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/tasks/timeline`;

  get(window: TimelineWindow, request: TimelineRequest): Observable<ApiTimeline> {
    const { projectId, filter } = request;
    let params = new HttpParams().set('from', window.from).set('to', window.to);
    if (projectId !== null) params = params.set('projectId', projectId);
    // The server leaves out completed tasks unless asked, even when the filter wants only them.
    if (request.includeCompleted || filter.status === 'completed') {
      params = params.set('includeCompleted', true);
    }
    if (filter.status && filter.status !== 'all') params = params.set('status', filter.status);
    params = appendTaskFilters(params, filter);
    return this.http.get<ApiTimeline>(this.url, { params });
  }
}
