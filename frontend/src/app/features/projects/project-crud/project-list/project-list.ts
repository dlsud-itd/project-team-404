import {
  CdkDrag,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
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
import { ProjectOrganizationService } from '../../project-organization/services/project-organization.service';
import type { ReorderableGroup } from '../../project-organization/types/project-organization.types';
import {
  activeProjectFilterCount,
  applyProjectQuery,
  projectColors,
  projectQueryFromParams,
  projectQueryToParams,
  type ProjectQuery,
  type ProjectSortField,
} from '../../project-organization/utils/project-query-params.util';
import { reorderPayload } from '../../project-organization/utils/reorder-projects.util';
import { splitProjects } from '../../project-organization/utils/split-projects.util';
import { ProjectsHeader } from '../../shared/components/projects-header/projects-header';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectCard } from '../components/project-card/project-card';
import { mapProjectError } from '../mappers/project-error.mapper';
import { ProjectService } from '../services/project.service';

const SORT_OPTIONS: readonly SortOption[] = [
  { value: 'sortOrder', label: 'Custom order' },
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
];

/**
 * The Projects tab: one page with every active project. In custom order, favorites and the
 * other projects can be dragged into a new order (the handle shows on hover), or moved with
 * Alt+Up and Alt+Down; that order is the dashboard's "Custom" sort. Archived projects live on
 * the Archive page.
 */
@Component({
  selector: 'app-projects-page',
  imports: [
    ProjectCard,
    ProjectsHeader,
    ProjectFilterBar,
    SortMenu,
    NgTemplateOutlet,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(ProjectsStore);
  private readonly projects = inject(ProjectService);
  private readonly organization = inject(ProjectOrganizationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * Filters and sort, kept in the URL so links and reloads keep them. Archived projects are
   * only shown on the Archive page, so an old ?archived=true link is ignored.
   */
  protected readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => ({ ...projectQueryFromParams(params), archived: false })),
    ),
    {
      initialValue: {
        ...projectQueryFromParams(this.route.snapshot.queryParamMap),
        archived: false,
      },
    },
  );
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly filterCount = computed(() => activeProjectFilterCount(this.query()));
  /** Any filter or sort shows one flat list instead of the Favorites / My projects groups. */
  protected readonly flat = computed(
    () => this.filterCount() > 0 || this.query().orderBy !== 'sortOrder',
  );
  protected readonly visible = computed(() =>
    applyProjectQuery(this.store.projects(), this.query()),
  );
  protected readonly colors = computed(() =>
    projectColors(this.store.active().filter((p) => !p.isInbox)),
  );

  private readonly split = computed(() => splitProjects(this.store.projects()));
  protected readonly favorites = computed(() => this.split().favorites);
  protected readonly others = computed(() => this.split().active);
  /** True until the first list request settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  protected readonly reordering = signal(false);
  protected readonly actionError = signal<string | null>(null);
  /** Read out by screen readers after a move. */
  protected readonly announcement = signal('');

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
      queryParams: projectQueryToParams({ ...this.query(), ...changes, archived: false }),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearFilters(): void {
    this.setQuery({ favorites: false, color: null });
  }

  protected setSort({ value, direction }: SortChange): void {
    const orderBy = SORT_OPTIONS.some((option) => option.value === value)
      ? (value as ProjectSortField)
      : 'sortOrder';
    this.setQuery({ orderBy, orderDirection: orderBy === 'sortOrder' ? 'asc' : direction });
  }

  protected dropped(group: ReorderableGroup, event: CdkDragDrop<unknown>): void {
    this.move(group, event.previousIndex, event.currentIndex);
  }

  /** Alt+Up / Alt+Down on a project: the keyboard way to drag it. */
  protected moveByKey(event: Event, group: ReorderableGroup, from: number, to: number): void {
    event.preventDefault();
    this.move(group, from, to);
  }

  /** Shows the new order at once; the service puts the old one back if saving fails. */
  protected move(group: ReorderableGroup, from: number, to: number): void {
    const split = this.split();
    const payload = reorderPayload(split, group, from, to);
    if (!payload || this.reordering()) return;

    const list = split[group];
    const project: Project = list[from];
    this.actionError.set(null);
    this.reordering.set(true);
    this.organization
      .reorder(payload)
      .pipe(
        finalize(() => this.reordering.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: unknown) => {
          const { message, notFound } = mapProjectError(error);
          this.actionError.set(`Your new order wasn't saved. ${message}`);
          this.announcement.set('');
          if (notFound) this.load();
        },
      });

    const position = Math.min(Math.max(to, 0), list.length - 1) + 1;
    this.announcement.set(`Moved ${project.name} to position ${position} of ${list.length}.`);
  }
}
