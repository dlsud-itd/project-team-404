import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { NewProjectDialog } from '../../../project-crud/components/new-project-dialog/new-project-dialog';
import { ProjectsStore } from '../../state/projects.store';

/** Title, new-project popup and the tabs between the project list and the organize view. */
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

    <nav class="tabs" aria-label="Project views">
      <a
        class="tab"
        routerLink="/home"
        [queryParams]="{ tab: 'projects' }"
        [class.active]="!organizing()"
        [attr.aria-current]="organizing() ? null : 'page'"
        >All projects</a
      >
      <a
        class="tab"
        routerLink="/home"
        [queryParams]="{ tab: 'projects', view: 'organize' }"
        [class.active]="organizing()"
        [attr.aria-current]="organizing() ? 'page' : null"
        >Organize</a
      >
    </nav>

    @if (store.creating()) {
      <app-new-project-dialog />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .back {
      color: var(--orange);
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
      font-weight: 800;
    }
    .new {
      display: inline-block;
      padding: 0.5rem 1.125rem;
      border: 0;
      border-radius: 999px;
      background: #7b23a8;
      color: #fff;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      &:hover {
        filter: brightness(1.1);
      }
    }
    .back,
    .new {
      &:focus-visible {
        outline: 2px solid var(--ink);
        outline-offset: 2px;
      }
    }
    .tabs {
      display: flex;
      gap: 1.5rem;
      margin: 0 0 1.5rem;
      border-bottom: 1px solid var(--orange-light);
    }
    .tab {
      margin-bottom: -1px;
      padding: 0.5rem 0;
      border-bottom: 2px solid transparent;
      color: var(--ink-muted);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      &:hover {
        color: var(--ink);
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .active {
      border-bottom-color: #7b23a8;
      color: var(--ink);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsHeader {
  protected readonly store = inject(ProjectsStore);

  /**
   * Both views share a path, so only ?view tells them apart. Matching the whole query would
   * lose the active tab as soon as the list's filters add their own params.
   */
  protected readonly organizing = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('view') === 'organize')),
    { initialValue: false },
  );
}
