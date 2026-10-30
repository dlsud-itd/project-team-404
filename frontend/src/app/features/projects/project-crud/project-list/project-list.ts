import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProjectsHeader } from '../../shared/components/projects-header/projects-header';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { ProjectCard } from '../components/project-card/project-card';
import { mapProjectError } from '../mappers/project-error.mapper';
import { ProjectService } from '../services/project.service';

/** Notice shown after a delete, e.g. “Capstone” was deleted. 4 tasks moved to your Inbox. */
export function deletedNotice(name: string, movedTaskCount: number): string {
  const deleted = `“${name}” was deleted.`;
  if (movedTaskCount === 0) return deleted;
  const tasks = movedTaskCount === 1 ? '1 task' : `${movedTaskCount} tasks`;
  return `${deleted} ${tasks} moved to your Inbox.`;
}

@Component({
  selector: 'app-projects-page',
  imports: [RouterLink, ProjectCard, ConfirmDeleteDialog, ProjectsHeader],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(ProjectsStore);
  private readonly projects = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly favorites = computed(() =>
    this.store.active().filter((p) => !p.isInbox && p.isFavorite),
  );
  protected readonly others = computed(() =>
    this.store.active().filter((p) => !p.isInbox && !p.isFavorite),
  );
  /** True until the first list request settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  protected readonly pendingDelete = signal<Project | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    // A page that sent the user here may say why, e.g. the edited project no longer exists.
    const error: unknown = inject(Router).currentNavigation()?.extras.state?.['error'];
    if (typeof error === 'string') this.actionError.set(error);
    this.load();
  }

  protected load(): void {
    this.projects
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected askDelete(project: Project): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.deleteError.set(null);
    this.pendingDelete.set(project);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const project = this.pendingDelete();
    if (!project || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.projects
      .delete(project.projectId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ movedTaskCount }) => {
          this.pendingDelete.set(null);
          this.notice.set(deletedNotice(project.name, movedTaskCount));
        },
        error: (error: unknown) => {
          const { message, notFound } = mapProjectError(error);
          if (notFound) {
            // Already gone (e.g. deleted in another tab): close and show the real list.
            this.pendingDelete.set(null);
            this.actionError.set(message);
            this.load();
            return;
          }
          this.deleteError.set(message);
        },
      });
  }
}
