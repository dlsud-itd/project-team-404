import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectService } from '../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import { PrioritiesStore } from '../../settings/state/priorities.store';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import type {
  ApiSearchResponse,
  SearchOptions,
  SearchProjectResult,
  SearchResult,
  SearchResults,
  SearchTaskResult,
} from '../types/search.types';

/** The server refuses shorter queries, so nothing is sent until the query is this long. */
export const MIN_QUERY_LENGTH = 2;
/** The server refuses longer queries. */
export const MAX_QUERY_LENGTH = 100;
/** How long typing must pause before a search is sent. */
export const SEARCH_DEBOUNCE_MS = 300;
/** Results shown in the header dropdown; the search page asks for the server's maximum. */
export const DROPDOWN_LIMIT = 5;
export const PAGE_LIMIT = 20;

/** Whether a query is long enough to send. */
export function isSearchable(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH;
}

/**
 * GET /api/search, plus what the search UI needs around it: filling in project names, priority
 * colors and due dates from the app's stores, and opening a result.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly projects = inject(ProjectsStore);
  private readonly projectService = inject(ProjectService);
  private readonly tasks = inject(TasksStore);
  private readonly priorities = inject(PrioritiesStore);
  private readonly url = `${environment.apiBaseUrl}/api/search`;

  /** Searches the user's tasks and projects. The query is trimmed and cut to 100 characters. */
  search(query: string, options: SearchOptions = {}): Observable<SearchResults> {
    const q = query.trim().slice(0, MAX_QUERY_LENGTH);
    const params = new HttpParams()
      .set('q', q)
      .set('type', options.type ?? 'all')
      .set('limit', String(options.limit ?? DROPDOWN_LIMIT))
      .set('includeArchived', String(options.includeArchived ?? false));
    this.loadProjects();
    return this.http.get<ApiSearchResponse>(this.url, { params }).pipe(
      map((body) => ({
        query: q,
        tasks: body.tasks.items,
        projects: body.projects.items,
        counts: { tasks: body.tasks.total, projects: body.projects.total },
      })),
    );
  }

  /**
   * Rows to show for some results. Reads the stores' signals, so calling this inside a computed
   * fills in project names once projects load.
   */
  toRows(results: SearchResults): { tasks: SearchTaskResult[]; projects: SearchProjectResult[] } {
    return {
      tasks: results.tasks.map((item): SearchTaskResult => {
        const project = item.projectId === null ? undefined : this.projects.byId(item.projectId);
        const task = this.tasks.byId(item.id);
        const priority = task ? this.priorities.byId(task.priorityId) : undefined;
        return {
          kind: 'task',
          id: item.id,
          title: item.title,
          projectId: item.projectId,
          projectName: project?.name ?? (item.projectId === null ? 'Inbox' : null),
          projectColor: project?.color ?? null,
          priorityName: priority?.name ?? null,
          priorityColor: priority?.color ?? null,
          dueDate: task?.dueDate ?? null,
          inDescription: item.matchedField === 'description',
          snippet: item.snippet,
          isArchived: item.isArchived,
        };
      }),
      projects: results.projects.map((item): SearchProjectResult => ({
        kind: 'project',
        id: item.id,
        name: item.name,
        color: this.projects.byId(item.id)?.color ?? null,
        inDescription: item.matchedField === 'description',
        snippet: item.snippet,
        isArchived: item.isArchived,
      })),
    };
  }

  /** A task opens in its project's task editor; a project opens its task list. */
  open(result: SearchResult): Promise<boolean> {
    if (result.kind === 'project') {
      return this.router.navigate(['/projects', result.id, 'tasks']);
    }
    const projectId = result.projectId ?? this.projects.inbox()?.projectId ?? null;
    if (projectId === null)
      return this.router.navigate(['/home'], { queryParams: { tab: 'tasks' } });
    return this.router.navigate(['/projects', projectId, 'tasks', result.id, 'edit']);
  }

  /** Project names and colors come from the projects store, so make sure it is filled once. */
  private loadProjects(): void {
    if (this.projects.loaded() || this.projects.loading()) return;
    // Only decorates the rows; search still works without it.
    this.projectService.refresh().subscribe({ error: () => undefined });
  }
}
