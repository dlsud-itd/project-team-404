import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { mapLabelError } from '../mappers/label-error.mapper';
import { toLabel } from '../mappers/label.mapper';
import { LabelsStore } from '../state/labels.store';
import type { ApiLabel, CreateLabelRequest, Label, UpdateLabelRequest } from '../types/label.types';

/**
 * Create, read, update and delete calls for /api/labels. Successful calls also update
 * LabelsStore, so the label pages and pickers stay in step without a reload.
 * The auth interceptor adds the token and handles expired sessions.
 */
@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(LabelsStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/labels`;

  list(): Observable<Label[]> {
    return this.http.get<ApiLabel[]>(this.baseUrl).pipe(map((labels) => labels.map(toLabel)));
  }

  /** Loads every label into the store, recording loading and error state there. */
  refresh(): Observable<Label[]> {
    this.store.startLoading();
    return this.list().pipe(
      tap({
        next: (labels) => this.store.setLabels(labels),
        error: (error: unknown) => this.store.fail(mapLabelError(error).message),
      }),
    );
  }

  get(labelId: number): Observable<Label> {
    return this.http.get<ApiLabel>(`${this.baseUrl}/${labelId}`).pipe(
      map(toLabel),
      tap((label) => this.store.upsert(label)),
    );
  }

  /** Sends a trimmed name and the color (null for none). */
  create(request: CreateLabelRequest): Observable<Label> {
    const body: CreateLabelRequest = { name: request.name.trim(), color: request.color };
    return this.http.post<ApiLabel>(this.baseUrl, body).pipe(
      map(toLabel),
      tap((label) => this.store.upsert(label)),
    );
  }

  /** PUT /api/labels/{id} with only the changed fields; the server replies with the label. */
  update(labelId: number, changes: UpdateLabelRequest): Observable<Label> {
    const body: UpdateLabelRequest =
      changes.name === undefined ? changes : { ...changes, name: changes.name.trim() };
    return this.http.put<ApiLabel>(`${this.baseUrl}/${labelId}`, body).pipe(
      map(toLabel),
      tap((label) => this.store.upsert(label)),
    );
  }

  /** Deletes a label; the server also takes it off every task. Replies 204 with no body. */
  delete(labelId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${labelId}`).pipe(
      tap(() => this.store.remove(labelId)),
      map(() => undefined),
    );
  }
}
