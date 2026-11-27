import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { ViewAllLink } from '../../../shared/components/view-all-link/view-all-link';
import { captureFlip } from '../../../shared/utils/flip.util';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import { SettingsStore } from '../../settings/state/settings.store';
import {
  DASHBOARD_PROJECT_SORTS,
  isDashboardProjectSort,
  type DashboardProjectSort,
} from '../../settings/types/user-settings.types';
import { DashboardStore } from '../dashboard.store';
import { sortDashboardProjects } from './sort-dashboard-projects.util';

/**
 * The dashboard's projects: only the ones starred as favorites, in the order the user picks.
 * The order is saved with the user's settings; changing it animates the rows into place.
 */
@Component({
  selector: 'app-project-list',
  imports: [ViewAllLink, RouterLink],
  template: `
    <section class="card" aria-labelledby="projects-heading">
      <header class="head">
        <h2 id="projects-heading">Favorite projects</h2>
        @if (favorites().length > 1) {
          <label class="sort">
            <span class="visually-hidden">Sort favorite projects</span>
            <select [value]="sort()" (change)="setSort($event)">
              @for (option of sortOptions; track option.value) {
                <option [value]="option.value" [selected]="option.value === sort()">
                  {{ option.label }}
                </option>
              }
            </select>
          </label>
        }
      </header>

      <ul #list class="list" tabindex="0" aria-label="Favorite projects">
        <li>
          <button
            type="button"
            class="row all"
            [class.active]="store.filter().projectId === undefined"
            [attr.aria-pressed]="store.filter().projectId === undefined"
            (click)="store.filter.set({})"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
            </svg>
            <span class="name">All Projects</span>
            <span class="count">{{ store.openTasks().length }}</span>
          </button>
        </li>

        @for (project of visibleProjects(); track project.projectId) {
          <li class="project" [attr.data-flip-key]="project.projectId">
            <button
              type="button"
              class="row"
              [class.active]="store.filter().projectId === project.projectId"
              [attr.aria-pressed]="store.filter().projectId === project.projectId"
              (click)="toggle(project.projectId)"
            >
              <span class="dot" [style.background]="project.color ?? null"></span>
              <span class="name">{{ project.name }}</span>
              <span class="count">{{ store.projectCounts().get(project.projectId) ?? 0 }}</span>
            </button>
          </li>
        } @empty {
          <li class="empty">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
            </svg>
            <span>
              Star a project to pin it here.
              <a routerLink="/home" [queryParams]="{ tab: 'projects' }">Go to Projects</a>
            </span>
          </li>
        }
      </ul>
      <app-view-all-link
        [total]="favorites().length"
        [shown]="visibleProjects().length"
        link="/home"
        [queryParams]="{ tab: 'projects' }"
        noun="favorite projects"
      />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.625rem;
    }
    h2 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .sort select {
      max-width: 9.5rem;
      padding: 0.125rem 0.25rem;
      border: 0;
      border-radius: 0.25rem;
      background: transparent;
      color: var(--ink-muted);
      font: inherit;
      font-size: 0.6875rem;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background: var(--hover-bg);
      }
    }
    /* A fixed maximum height: a long list scrolls inside the card. */
    .list {
      display: grid;
      gap: 0.125rem;
      max-height: 16rem;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      list-style: none;
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
    .project {
      min-width: 0;
    }
    .row {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      padding: 0.375rem 0.5rem;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 400;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background: var(--hover-bg);
      }
      &.active {
        background: var(--active-bg);
        color: var(--ink);
        font-weight: 500;
      }
    }
    .all svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linejoin: round;
    }
    /* A project's color only ever shows as this dot. */
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      margin: 0 0.25rem;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--ink-muted);
    }
    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      color: var(--ink-muted);
      font-weight: 600;
    }
    .empty {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0.25rem 0 0;
      padding: 0.625rem 0.5rem;
      border-radius: 0.375rem;
      background: var(--hover-bg);
      color: var(--ink-muted);
      font-size: 0.6875rem;
      line-height: 1.4;
      svg {
        width: 0.875rem;
        height: 0.875rem;
        flex: none;
        margin-top: 0.0625rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.3;
        stroke-linejoin: round;
      }
      a {
        color: var(--theme-primary);
        font-weight: 600;
      }
    }
    button:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--theme-primary);
      outline-offset: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(DashboardStore);
  private readonly projects = inject(ProjectsStore);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly sortOptions = DASHBOARD_PROJECT_SORTS;
  /** The order just picked, shown at once while it saves; then the saved one. */
  private readonly pendingSort = signal<DashboardProjectSort | null>(null);
  protected readonly sort = computed(
    () => this.pendingSort() ?? this.settings.dashboardProjectSort(),
  );

  /** Starred, active projects; the Inbox can't be starred. */
  protected readonly favorites = computed(() =>
    sortDashboardProjects(
      this.projects.active().filter((p) => p.isFavorite && !p.isInbox),
      this.sort(),
    ),
  );
  /** Capped at the user's "projects in the dashboard list" setting. */
  protected readonly visibleProjects = computed(() =>
    this.favorites().slice(0, this.settings.projectLimit()),
  );

  protected toggle(projectId: number): void {
    this.store.filter.update((filter) => (filter.projectId === projectId ? {} : { projectId }));
  }

  protected setSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!isDashboardProjectSort(value) || value === this.sort()) return;
    const previous = this.sort();
    this.animate(() => this.pendingSort.set(value));
    this.settings.save({ dashboardProjectSort: value }).subscribe({
      next: () => {
        this.pendingSort.set(null);
        const label = this.sortOptions.find((option) => option.value === value)?.label;
        if (label) this.toast.neutral(`Favorite projects sorted by ${label.toLowerCase()}`);
      },
      error: () => {
        this.animate(() => this.pendingSort.set(previous));
        this.toast.error("Couldn't save the project order. Please try again.");
      },
    });
  }

  /** Applies an order change and slides the rows to their new places. */
  private animate(change: () => void): void {
    const play = captureFlip(this.list()?.nativeElement);
    change();
    afterNextRender(play, { injector: this.injector });
  }
}
