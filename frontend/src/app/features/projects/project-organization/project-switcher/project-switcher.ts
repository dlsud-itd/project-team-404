import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { mapProjectError } from '../../project-crud/mappers/project-error.mapper';
import { ProjectService } from '../../project-crud/services/project.service';
import { ProjectsHeader } from '../../shared/components/projects-header/projects-header';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectOrganizationService } from '../services/project-organization.service';
import type { ReorderableGroup } from '../types/project-organization.types';
import { reorderPayload } from '../utils/reorder-projects.util';
import { splitProjects } from '../utils/split-projects.util';

/**
 * Lets the user switch to a project, star it, archive or restore it, and change the order of
 * favorites and other projects by dragging or with the move buttons.
 */
@Component({
  selector: 'app-project-switcher',
  imports: [
    NgTemplateOutlet,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    ProjectsHeader,
  ],
  templateUrl: './project-switcher.html',
  styleUrl: './project-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSwitcher {
  protected readonly store = inject(ProjectsStore);
  private readonly projects = inject(ProjectService);
  private readonly organization = inject(ProjectOrganizationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly split = computed(() => splitProjects(this.store.projects()));
  /** True until the first list request settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  /** Ids of projects with a favorite or archive request in flight. */
  protected readonly pending = signal<ReadonlySet<number>>(new Set());
  protected readonly reordering = signal(false);
  protected readonly actionError = signal<string | null>(null);
  /** Read out by screen readers after each change. */
  protected readonly announcement = signal('');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.projects
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected isPending(project: Project): boolean {
    return this.pending().has(project.projectId);
  }

  protected select(project: Project): void {
    this.store.select(project.projectId);
    this.announcement.set(`Switched to ${project.name}.`);
  }

  protected toggleFavorite(project: Project): void {
    const isFavorite = !project.isFavorite;
    this.run(
      project,
      this.organization.setFavorite(project, isFavorite),
      isFavorite
        ? `Added ${project.name} to favorites.`
        : `Removed ${project.name} from favorites.`,
    );
  }

  protected setArchived(project: Project, isArchived: boolean): void {
    this.run(
      project,
      this.organization.setArchived(project, isArchived),
      isArchived ? `Archived ${project.name}.` : `Restored ${project.name}.`,
    );
  }

  protected dropped(group: ReorderableGroup, event: CdkDragDrop<unknown>): void {
    this.move(group, event.previousIndex, event.currentIndex);
  }

  protected move(group: ReorderableGroup, from: number, to: number): void {
    const split = this.split();
    const payload = reorderPayload(split, group, from, to);
    if (!payload || this.reordering()) return;

    const project = split[group][from];
    const list = split[group];
    this.actionError.set(null);
    this.reordering.set(true);

    this.organization
      .reorder(payload)
      .pipe(
        finalize(() => this.reordering.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ error: (error: unknown) => this.failed(error) });

    const position = Math.min(Math.max(to, 0), list.length - 1) + 1;
    this.announcement.set(`Moved ${project.name} to position ${position} of ${list.length}.`);
  }

  /** Sends a favorite or archive change, marking the project busy until it settles. */
  private run(project: Project, request: Observable<unknown>, done: string): void {
    if (this.isPending(project)) return;
    const id = project.projectId;
    this.actionError.set(null);
    this.pending.update((ids) => new Set(ids).add(id));
    this.announcement.set(done);

    request
      .pipe(
        finalize(() =>
          this.pending.update((ids) => {
            const next = new Set(ids);
            next.delete(id);
            return next;
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ error: (error: unknown) => this.failed(error) });
  }

  /** The service has already undone the change; tell the user why. */
  private failed(error: unknown): void {
    const { message, notFound } = mapProjectError(error);
    this.actionError.set(`Your change wasn't saved. ${message}`);
    this.announcement.set('');
    // Gone or out of date (e.g. changed in another tab): show the real list.
    if (notFound) this.load();
  }
}
