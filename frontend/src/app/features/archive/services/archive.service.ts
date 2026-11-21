import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectOrganizationService } from '../../projects/project-organization/services/project-organization.service';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import type {
  ApiArchiveResponse,
  ArchiveItem,
  ArchiveKind,
  ArchivePage,
  ArchiveTab,
} from '../types/archive.types';

/** A label was archived, restored or deleted somewhere; open label lists can catch up. */
export interface LabelArchiveChange {
  labelId: number;
  isArchived: boolean;
  deleted?: boolean;
}

export const ARCHIVE_PAGE_SIZE = 20;

const PATH: Record<ArchiveKind, string> = {
  task: 'tasks',
  project: 'projects',
  label: 'labels',
};

/** Order inside one archivedAt instant, the same as the server's: tasks, projects, labels. */
const KIND_RANK: Record<ArchiveKind, number> = { task: 0, project: 1, label: 2 };

/**
 * GET /api/archive, plus archive, restore and permanent delete for tasks, projects and labels.
 * Successful calls also update the shared task and project stores, so an archived item drops
 * out of every active list without a reload.
 */
@Injectable({ providedIn: 'root' })
export class ArchiveService {
  private readonly http = inject(HttpClient);
  private readonly tasks = inject(TasksStore);
  private readonly projects = inject(ProjectsStore);
  private readonly projectOrganization = inject(ProjectOrganizationService);
  private readonly api = `${environment.apiBaseUrl}/api`;

  private readonly labelChanges = new Subject<LabelArchiveChange>();
  /** Emits after a label is archived, restored or deleted through this service. */
  readonly labelArchiveChanges = this.labelChanges.asObservable();

  /** One page of archived items for a tab, newest first. */
  list(tab: ArchiveTab, cursor?: string | null, limit = ARCHIVE_PAGE_SIZE): Observable<ArchivePage> {
    let params = new HttpParams().set('type', tab).set('limit', String(limit));
    if (cursor) params = params.set('cursor', cursor);
    return this.http
      .get<ApiArchiveResponse>(`${this.api}/archive`, { params })
      .pipe(map((body) => this.toPage(body)));
  }

  /** PUT /api/{kind}/:id/archive: true archives the item, false restores it. */
  setArchived(kind: ArchiveKind, id: number, isArchived: boolean): Observable<void> {
    const project = kind === 'project' ? this.projects.byId(id) : undefined;
    // Projects the store knows go through ProjectOrganizationService, which updates the
    // store straight away and puts it back if the request fails.
    const request: Observable<unknown> = project
      ? this.projectOrganization.setArchived(project, isArchived)
      : this.http.put(`${this.api}/${PATH[kind]}/${id}/archive`, { isArchived });

    return request.pipe(
      tap(() => this.synced(kind, id, isArchived)),
      map(() => undefined),
    );
  }

  archive(kind: ArchiveKind, id: number): Observable<void> {
    return this.setArchived(kind, id, true);
  }

  restore(kind: ArchiveKind, id: number): Observable<void> {
    return this.setArchived(kind, id, false);
  }

  /**
   * DELETE /api/{kind}/:id. Tasks and projects are soft-deleted (a project's tasks move to the
   * Inbox); labels are removed for good.
   */
  deletePermanently(kind: ArchiveKind, id: number): Observable<void> {
    return this.http.delete(`${this.api}/${PATH[kind]}/${id}`).pipe(
      tap(() => {
        if (kind === 'task') this.tasks.remove(id);
        else if (kind === 'project') this.projects.remove(id);
        else this.labelChanges.next({ labelId: id, isArchived: true, deleted: true });
      }),
      map(() => undefined),
    );
  }

  private synced(kind: ArchiveKind, id: number, isArchived: boolean): void {
    if (kind === 'task') {
      this.tasks.patch(id, {
        isArchived,
        archivedAt: isArchived ? new Date().toISOString() : null,
      });
    } else if (kind === 'project') {
      this.projects.patch(id, { isArchived });
    } else {
      this.labelChanges.next({ labelId: id, isArchived });
    }
  }

  private toPage(body: ApiArchiveResponse): ArchivePage {
    const items: ArchiveItem[] = [
      ...body.tasks.items.map((task): ArchiveItem => {
        const project = task.projectId === null ? undefined : this.projects.byId(task.projectId);
        return {
          kind: 'task',
          id: task.id,
          name: task.title,
          archivedAt: task.archivedAt ?? '',
          projectId: task.projectId,
          projectName: project?.name ?? null,
          color: project?.color ?? null,
        };
      }),
      ...body.projects.items.map(
        (project): ArchiveItem => ({
          kind: 'project',
          id: project.id,
          name: project.name,
          archivedAt: project.archivedAt ?? '',
          color: project.color,
        }),
      ),
      ...body.labels.items.map(
        (label): ArchiveItem => ({
          kind: 'label',
          id: label.id,
          name: label.name,
          archivedAt: label.archivedAt ?? '',
          color: label.color,
          taskCount: label.taskCount ?? null,
        }),
      ),
    ].sort(newestFirst);

    const counts = {
      tasks: body.tasks.total,
      projects: body.projects.total,
      labels: body.labels.total,
    };
    return {
      items,
      counts: { ...counts, all: counts.tasks + counts.projects + counts.labels },
      nextCursor: body.nextCursor,
    };
  }
}

function newestFirst(a: ArchiveItem, b: ArchiveItem): number {
  return (
    b.archivedAt.localeCompare(a.archivedAt) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.id - a.id
  );
}
