import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ViewAllLink } from '../../../shared/components/view-all-link/view-all-link';
import { SettingsStore } from '../../settings/state/settings.store';
import { DashboardStore } from '../dashboard.store';

@Component({
  selector: 'app-project-list',
  imports: [ViewAllLink],
  template: `
    <section class="card" aria-labelledby="projects-heading">
      <header class="head">
        <h2 id="projects-heading">Projects</h2>
      </header>

      <ul class="list" tabindex="0" aria-label="Projects">
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

        @for (project of visibleProjects(); track project.id) {
          <li class="project">
            <button
              type="button"
              class="row"
              [class.active]="store.filter().projectId === project.id"
              [attr.aria-pressed]="store.filter().projectId === project.id"
              (click)="toggle(project.id)"
            >
              <span class="swatch" [style.background]="project.color ?? '#bbb'"></span>
              <span class="name">{{ project.name }}</span>
              <span class="count">{{ store.projectCounts().get(project.id) ?? 0 }}</span>
            </button>
          </li>
        } @empty {
          <li class="empty">No active projects</li>
        }
      </ul>
      <app-view-all-link
        [total]="store.projects().length"
        [shown]="visibleProjects().length"
        link="/home"
        [queryParams]="{ tab: 'projects' }"
        noun="projects"
      />
      <p class="manage-note">Create and manage projects in the Projects tab.</p>
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
      margin-bottom: 0.625rem;
    }
    h2 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }
    /* A fixed maximum height: a long list scrolls inside the card. */
    .list {
      display: grid;
      gap: 0.375rem;
      max-height: 16rem;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      list-style: none;
      &:focus-visible {
        outline: 2px solid #7b23a8;
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
      font-size: 0.6875rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      &:hover {
        background: #fdeee6;
      }
      &.active {
        background: #fbc4a6;
      }
    }
    .all svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: #7b23a8;
      stroke-width: 2;
      stroke-linejoin: round;
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      font-weight: 700;
    }
    .empty,
    .manage-note {
      margin: 0.5rem 0 0;
      color: var(--ink-muted);
      font-size: 0.625rem;
    }
    button:focus-visible {
      outline: 2px solid #7b23a8;
      outline-offset: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(DashboardStore);
  private readonly settings = inject(SettingsStore);
  /** Active projects, capped at the user's "projects in the dashboard list" setting. */
  protected readonly visibleProjects = computed(() =>
    this.store.projects().slice(0, this.settings.projectLimit()),
  );

  protected toggle(projectId: number): void {
    this.store.filter.update((filter) => (filter.projectId === projectId ? {} : { projectId }));
  }
}
