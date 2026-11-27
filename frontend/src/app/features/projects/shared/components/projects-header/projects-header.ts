import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewProjectDialog } from '../../../project-crud/components/new-project-dialog/new-project-dialog';
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
        <button type="button" class="new" (click)="store.creating.set(true)">+ New project</button>
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
      &:hover {
        filter: brightness(1.08);
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
}
