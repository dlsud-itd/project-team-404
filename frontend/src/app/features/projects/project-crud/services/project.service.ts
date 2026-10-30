import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type {
  ApiProject,
  CreateProjectRequest,
  DeleteProjectResponse,
  Project,
  UpdateProjectRequest,
  UpdateProjectResponse,
} from '../../shared/types/project.types';
import { mapProjectError } from '../mappers/project-error.mapper';
import { toProject } from '../mappers/project.mapper';

/**
 * Create, read, update and delete calls for /api/projects. Successful calls also update
 * ProjectsStore, so every view of the project list stays in step without a reload.
 * The auth interceptor adds the token and handles expired sessions.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(ProjectsStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/projects`;

  /** GET /api/projects. `archived` limits the list to archived or active projects. */
  list(archived?: boolean): Observable<Project[]> {
    const params =
      archived === undefined ? undefined : new HttpParams().set('archived', String(archived));
    return this.http
      .get<ApiProject[]>(this.baseUrl, { params })
      .pipe(map((projects) => projects.map(toProject)));
  }

  /** Loads every project into the store, recording loading and error state there. */
  refresh(): Observable<Project[]> {
    this.store.startLoading();
    return this.list().pipe(
      tap({
        next: (projects) => this.store.setProjects(projects),
        error: (error: unknown) => this.store.fail(mapProjectError(error).message),
      }),
    );
  }

  get(projectId: number): Observable<Project> {
    return this.http.get<ApiProject>(`${this.baseUrl}/${projectId}`).pipe(
      map(toProject),
      tap((project) => this.store.upsert(project)),
    );
  }

  /** Sends only name, description and color; the server sets the flags. */
  create(request: CreateProjectRequest): Observable<Project> {
    const body: CreateProjectRequest = {
      name: request.name,
      description: request.description,
      color: request.color,
    };
    return this.http.post<ApiProject>(this.baseUrl, body).pipe(
      map(toProject),
      tap((project) => this.store.upsert(project)),
    );
  }

  /** PUT /api/projects/{id} with only the changed fields. */
  update(projectId: number, changes: UpdateProjectRequest): Observable<UpdateProjectResponse> {
    return this.http
      .put<UpdateProjectResponse>(`${this.baseUrl}/${projectId}`, changes)
      .pipe(tap(() => this.store.patch(projectId, changes)));
  }

  /** Soft-deletes a project; the server moves its tasks to the Inbox. */
  delete(projectId: number): Observable<DeleteProjectResponse> {
    return this.http.delete<DeleteProjectResponse>(`${this.baseUrl}/${projectId}`).pipe(
      tap(() => this.store.remove(projectId)),
      map((response) => ({ ...response, movedTaskCount: response.movedTaskCount ?? 0 })),
    );
  }
}
