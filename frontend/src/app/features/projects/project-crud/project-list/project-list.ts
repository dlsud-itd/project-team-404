import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, map } from 'rxjs';
import {
  SortMenu,
  type SortChange,
  type SortOption,
} from '../../../tasks/task-organization/components/sort-menu/sort-menu';
import { ProjectFilterBar } from '../../project-organization/components/project-filter-bar/project-filter-bar';
import {
  activeProjectFilterCount,
  applyProjectQuery,
  projectColors,
  projectQueryFromParams,
  projectQueryToParams,
  type ProjectQuery,
  type ProjectSortField,
} from '../../project-organization/utils/project-query-params.util';
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

const SORT_OPTIONS: readonly SortOption[] = [
  { value: 'sortOrder', label: 'Custom order' },
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
];

@Component({
  selector: 'app-projects-page',
  imports: [
    ProjectCard,
    ConfirmDeleteDialog,
    ProjectsHeader,
    ProjectFilterBar,
    SortMenu,
    NgTemplateOutlet,
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(ProjectsStore);
  private readonly projects = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Filters and sort, kept in the URL so links and reloads keep them. */
  protected readonly query = toSignal(this.route.queryParamMap.pipe(map(projectQueryFromParams)), {
    initialValue: projectQueryFromParams(this.route.snapshot.queryParamMap),
  });
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly filterCount = computed(() => activeProjectFilterCount(this.query()));
  /** Any filter or sort shows one flat list instead of the Favorites / My projects groups. */
  protected readonly flat = computed(
    () => this.filterCount() > 0 || this.query().orderBy !== 'sortOrder',
  );
  protected readonly visible = computed(() =>
    applyProjectQuery(this.store.projects(), this.query()),
  );
  /** The colors of the projects the Archived toggle is looking at. */
  protected readonly colors = computed(() =>
    projectColors(
      this.store.projects().filter((p) => !p.isInbox && p.isArchived === this.query().archived),
    ),
  );

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
    const error: unknown = this.router.currentNavigation()?.extras.state?.['error'];
    const navigationError = this.store.consumeNavigationError();
    if (typeof error === 'string') this.actionError.set(error);
    else if (navigationError) this.actionError.set(navigationError);
    this.load();
  }

  protected load(): void {
    this.projects
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected setQuery(changes: Partial<ProjectQuery>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: projectQueryToParams({ ...this.query(), ...changes }),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearFilters(): void {
    this.setQuery({ favorites: false, archived: false, color: null });
  }

  protected setSort({ value, direction }: SortChange): void {
    const orderBy = SORT_OPTIONS.some((option) => option.value === value)
      ? (value as ProjectSortField)
      : 'sortOrder';
    this.setQuery({ orderBy, orderDirection: orderBy === 'sortOrder' ? 'asc' : direction });
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
