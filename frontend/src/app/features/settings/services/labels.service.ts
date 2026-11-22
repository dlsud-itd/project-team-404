import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { LabelSetting, NameAndColor } from '../types/settings.types';

/** A label as /api/labels sends it. Sprint 3 servers leave out the Sprint 5 fields. */
interface ApiLabel {
  id: number;
  name: string;
  color: string | null;
  taskCount?: number;
  sortOrder?: number;
  isArchived?: boolean;
  archivedAt?: string | null;
}

/** Label calls for the settings page: list, CRUD, reorder and archive (Sprint 5 API). */
@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/labels`;

  /** GET /api/labels: active labels by default, or the archived ones, in the user's order. */
  list(archived = false): Observable<LabelSetting[]> {
    const params = new HttpParams().set('isArchived', String(archived));
    return this.http.get<ApiLabel[]>(this.baseUrl, { params }).pipe(
      map((labels) =>
        labels
          .map(toLabelSetting)
          // Older servers ignore isArchived and send every label as active.
          .filter((label) => label.isArchived === archived)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      ),
    );
  }

  create(input: NameAndColor): Observable<LabelSetting> {
    return this.http.post<ApiLabel>(this.baseUrl, input).pipe(map(toLabelSetting));
  }

  update(labelId: number, input: Partial<NameAndColor>): Observable<LabelSetting> {
    return this.http.put<ApiLabel>(`${this.baseUrl}/${labelId}`, input).pipe(map(toLabelSetting));
  }

  delete(labelId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${labelId}`);
  }

  /** PUT /api/labels/reorder with every active label id, in the new order. */
  reorder(labelIds: readonly number[]): Observable<number[]> {
    return this.http
      .put<{ labelIds: number[] }>(`${this.baseUrl}/reorder`, { labelIds })
      .pipe(map((body) => body.labelIds));
  }

  /** PUT /api/labels/:id/archive: true archives the label, false restores it. */
  setArchived(labelId: number, isArchived: boolean): Observable<LabelSetting> {
    return this.http
      .put<ApiLabel>(`${this.baseUrl}/${labelId}/archive`, { isArchived })
      .pipe(map(toLabelSetting));
  }
}

function toLabelSetting(label: ApiLabel, index = 0): LabelSetting {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    taskCount: label.taskCount ?? null,
    sortOrder: label.sortOrder ?? index,
    isArchived: label.isArchived ?? false,
    archivedAt: label.archivedAt ?? null,
  };
}
