import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, defer, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import type {
  ProjectSortOrder,
  ReorderPayload,
  ReorderProjectsResponse,
  SetArchivedResponse,
  SetFavoriteResponse,
} from '../types/project-organization.types';

/**
 * Favorite, archive and reorder calls for /api/projects. Each call updates ProjectsStore
 * straight away and puts the old values back if the request fails, so the UI never waits
 * on the network. Errors are passed on unchanged; callers map them with mapProjectError.
 */
@Injectable({ providedIn: 'root' })
export class ProjectOrganizationService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(ProjectsStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/projects`;

  setFavorite(project: Project, isFavorite: boolean): Observable<SetFavoriteResponse> {
    return this.optimistic(project.projectId, 'isFavorite', isFavorite, () =>
      this.http.put<SetFavoriteResponse>(`${this.baseUrl}/${project.projectId}/favorite`, {
        isFavorite,
      }),
    );
  }

  /** The server refuses to archive the Inbox. */
  setArchived(project: Project, isArchived: boolean): Observable<SetArchivedResponse> {
    return this.optimistic(project.projectId, 'isArchived', isArchived, () =>
      this.http.put<SetArchivedResponse>(`${this.baseUrl}/${project.projectId}/archive`, {
        isArchived,
      }),
    );
  }

  /** PUT /api/projects/reorder, then stores the sort orders the server saved. */
  reorder({ request, sortOrders }: ReorderPayload): Observable<ReorderProjectsResponse> {
    return defer(() => {
      const previous: ProjectSortOrder[] = this.store
        .projects()
        .map(({ projectId, sortOrder }) => ({ projectId, sortOrder }));
      this.store.applySortOrders(sortOrders);

      return this.http.put<ReorderProjectsResponse>(`${this.baseUrl}/reorder`, request).pipe(
        tap(({ projects }) => this.store.applySortOrders(projects)),
        catchError((error: unknown) => {
          this.store.applySortOrders(previous);
          return throwError(() => error);
        }),
      );
    });
  }

  /** Sets the flag now, sends the request, and restores the old value on error. */
  private optimistic<T>(
    projectId: number,
    flag: 'isFavorite' | 'isArchived',
    value: boolean,
    send: () => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const previous = this.store.byId(projectId)?.[flag];
      this.store.patch(projectId, { [flag]: value });

      return send().pipe(
        catchError((error: unknown) => {
          if (previous !== undefined) this.store.patch(projectId, { [flag]: previous });
          return throwError(() => error);
        }),
      );
    });
  }
}
