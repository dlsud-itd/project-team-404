import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewProjectDialog } from '../../../project-crud/components/new-project-dialog/new-project-dialog';
import { MAX_ACTIVE_PROJECTS } from '../../project-limit';
import { ProjectsStore } from '../../state/projects.store';

/** Title and new-project popup of the Projects page. */
@Component({
  selector: 'app-projects-header',
  imports: [RouterLink, NewProjectDialog],
  template: `
    <header>
      <a class="back" routerLink="/home">← Dashboard</a>
      <div class="title-row">
        <h1>Projects</h1>
        <div class="actions">
          @if (store.loaded()) {
            <p id="project-limit-hint" class="limit" [class.full]="store.atProjectLimit()">
              {{ store.activeCount() }} of {{ max }} projects
              @if (store.atProjectLimit()) {
                <span>· archive one to add another</span>
              }
            </p>
          }
          <button
            type="button"
            class="new"
            [disabled]="store.atProjectLimit()"
            [attr.aria-describedby]="store.loaded() ? 'project-limit-hint' : null"
            (click)="store.creating.set(true)"
          >
            + New project
          </button>
        </div>
      </div>
    </header>

    @if (store.creating()) {
      <app-new-project-dialog />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .back {
      color: var(--theme-primary);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
    .title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0.75rem 0 1.25rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 600;
    }
    .new {
      display: inline-block;
      padding: 0.5rem 1.125rem;
      border: 0;
      border-radius: 0.5rem;
      background: var(--theme-primary);
      color: var(--on-primary);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: filter var(--duration-fast) var(--ease-out);
      &:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }
    .limit {
      margin: 0;
      color: var(--ink-muted);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
      &.full {
        color: var(--ink);
      }
    }
    .back,
    .new {
      &:focus-visible {
        outline: 2px solid var(--ink);
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsHeader {
  protected readonly store = inject(ProjectsStore);
  protected readonly max = MAX_ACTIVE_PROJECTS;
}
