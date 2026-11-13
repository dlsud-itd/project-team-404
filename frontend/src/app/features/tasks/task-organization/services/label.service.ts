import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, endWith, ignoreElements, map, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { TaskLabel } from '../../shared/types/task.types';

export interface Label {
  labelId: number;
  name: string;
  color: string | null;
}

interface ApiLabel {
  id: number;
  name: string;
  color: string | null;
}

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/labels`;
  private readonly tasksUrl = `${environment.apiBaseUrl}/api/tasks`;

  list(): Observable<Label[]> {
    return this.http.get<ApiLabel[]>(this.baseUrl).pipe(map((labels) => labels.map(toLabel)));
  }

  create(input: { name: string; color: string | null }): Observable<Label> {
    return this.http.post<ApiLabel>(this.baseUrl, input).pipe(map(toLabel));
  }

  update(
    labelId: number,
    input: { name: string; color: string | null },
  ): Observable<Label> {
    return this.http
      .put<ApiLabel>(`${this.baseUrl}/${labelId}`, input)
      .pipe(map(toLabel));
  }

  delete(labelId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${labelId}`);
  }

  syncTaskLabels(
    taskId: number,
    currentLabelIds: number[],
    desiredLabelIds: number[],
  ): Observable<TaskLabel[]> {
    const current = new Set(currentLabelIds);
    const desired = new Set(desiredLabelIds);
    const requests: Observable<unknown>[] = [];
    for (const labelId of current) {
      if (!desired.has(labelId)) {
        requests.push(this.http.delete(`${this.tasksUrl}/${taskId}/labels/${labelId}`));
      }
    }
    const additions = [...desired].filter((labelId) => !current.has(labelId));
    if (additions.length) {
      requests.push(this.http.post(`${this.tasksUrl}/${taskId}/labels`, { labelIds: additions }));
    }
    const fetchLabels = () =>
      this.http
        .get<ApiLabel[]>(`${this.tasksUrl}/${taskId}/labels`)
        .pipe(map((labels) => labels.map(toTaskLabel)));
    if (!requests.length) return fetchLabels();
    return concat(...requests).pipe(
      ignoreElements(),
      endWith(null),
      switchMap(fetchLabels),
    );
  }
}

function toLabel(label: ApiLabel): Label {
  return { labelId: label.id, name: label.name, color: label.color };
}

function toTaskLabel(label: ApiLabel): TaskLabel {
  return { labelId: label.id, name: label.name, color: label.color };
}
