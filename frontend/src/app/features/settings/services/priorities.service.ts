import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { DeletePriorityResult, NameAndColor, PriorityLevel } from '../types/settings.types';

interface ApiPriority {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
  taskCount?: number;
}

/** Calls for /api/priorities, the user's own priority levels (Sprint 5 API). */
@Injectable({ providedIn: 'root' })
export class PrioritiesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/priorities`;

  /** The user's levels in their order. */
  list(): Observable<PriorityLevel[]> {
    return this.http
      .get<ApiPriority[]>(this.baseUrl)
      .pipe(
        map((levels) =>
          levels.map(toPriorityLevel).sort((left, right) => left.sortOrder - right.sortOrder),
        ),
      );
  }

  create(input: NameAndColor): Observable<PriorityLevel> {
    return this.http.post<ApiPriority>(this.baseUrl, input).pipe(map(toPriorityLevel));
  }

  update(priorityId: number, input: Partial<NameAndColor>): Observable<PriorityLevel> {
    return this.http
      .put<ApiPriority>(`${this.baseUrl}/${priorityId}`, input)
      .pipe(map(toPriorityLevel));
  }

  /**
   * Deletes a level. `reassignTo` names the level its tasks move to; the server requires it when
   * tasks use the level.
   */
  delete(priorityId: number, reassignTo: number | null): Observable<DeletePriorityResult> {
    const params = reassignTo === null ? undefined : new HttpParams().set('reassignTo', reassignTo);
    return this.http.delete<DeletePriorityResult>(`${this.baseUrl}/${priorityId}`, { params });
  }

  setDefault(priorityId: number): Observable<{ id: number; isDefault: true }> {
    return this.http.put<{ id: number; isDefault: true }>(
      `${this.baseUrl}/${priorityId}/default`,
      null,
    );
  }

  /** PUT /api/priorities/reorder with every level id, in the new order. */
  reorder(priorityIds: readonly number[]): Observable<number[]> {
    return this.http
      .put<{ priorityIds: number[] }>(`${this.baseUrl}/reorder`, { priorityIds })
      .pipe(map((body) => body.priorityIds));
  }
}

function toPriorityLevel(level: ApiPriority): PriorityLevel {
  return {
    id: level.id,
    name: level.name,
    color: level.color,
    sortOrder: level.sortOrder,
    isDefault: level.isDefault,
    taskCount: level.taskCount ?? null,
  };
}
