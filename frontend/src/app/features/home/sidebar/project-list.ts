import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DashboardStore } from '../dashboard.store';

@Component({
  selector: 'app-project-list',
  template: `
    <section class="card" aria-labelledby="projects-heading">
      <header class="head">
        <h2 id="projects-heading">Projects</h2>
        <button
          type="button"
          class="add"
          aria-label="Add project"
          [attr.aria-expanded]="adding()"
          (click)="adding.set(!adding())"
        >
          +
        </button>
      </header>

      @if (adding()) {
        <form
          class="name-form"
          (submit)="$event.preventDefault(); create(newName.value); newName.value = ''"
        >
          <input #newName aria-label="New project name" placeholder="Project name" maxlength="40" />
          <button type="submit">Add</button>
        </form>
      }

      <ul class="list">
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

        @for (project of store.projects(); track project.id) {
          <li class="project">
            @if (editingId() === project.id) {
              <form
                class="name-form"
                (submit)="$event.preventDefault(); rename(project.id, editName.value)"
              >
                <input
                  #editName
                  [value]="project.name"
                  aria-label="Project name"
                  maxlength="40"
                  (keydown.escape)="editingId.set(null)"
                />
                <button type="submit">Save</button>
              </form>
            } @else {
              <button
                type="button"
                class="row"
                [class.active]="store.filter().projectId === project.id"
                [attr.aria-pressed]="store.filter().projectId === project.id"
                (click)="toggle(project.id)"
              >
                <span class="swatch" [style.background]="project.color"></span>
                <span class="name">{{ project.name }}</span>
                <span class="count">{{ store.projectCounts().get(project.id) ?? 0 }}</span>
              </button>
              <button
                type="button"
                class="icon"
                [attr.aria-label]="'Rename ' + project.name"
                (click)="editingId.set(project.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />
                </svg>
              </button>
              <button
                type="button"
                class="icon"
                [attr.aria-label]="'Delete ' + project.name"
                (click)="store.deleteProject(project.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                </svg>
              </button>
            }
          </li>
        }
      </ul>
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
    .add {
      width: 1.5rem;
      height: 1.5rem;
      border: 0;
      border-radius: 0.25rem;
      background: #e9b0f0;
      color: var(--orange);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .list {
      display: grid;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .project {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-width: 0;
    }
    .icon {
      flex-shrink: 0;
    }
    .row {
      display: flex;
      flex: 1;
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
    .icon {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      border: 0;
      border-radius: 0.25rem;
      background: none;
      cursor: pointer;
      &:hover {
        background: #fdeee6;
      }
      svg {
        width: 0.875rem;
        height: 0.875rem;
        fill: none;
        stroke: var(--ink);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    }
    .name-form {
      display: flex;
      flex: 1;
      gap: 0.25rem;
      margin-bottom: 0.375rem;
      input {
        flex: 1;
        min-width: 0;
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--orange-light);
        border-radius: 0.375rem;
        font: inherit;
        font-size: 0.75rem;
      }
      button {
        padding: 0.25rem 0.5rem;
        border: 0;
        border-radius: 0.375rem;
        background: var(--ink);
        color: #fff;
        font: inherit;
        font-size: 0.6875rem;
        cursor: pointer;
      }
    }
    button:focus-visible,
    input:focus-visible {
      outline: 2px solid #7b23a8;
      outline-offset: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectList {
  protected readonly store = inject(DashboardStore);
  protected readonly adding = signal(false);
  protected readonly editingId = signal<number | null>(null);

  /** Filters by a project; clicking the active project again clears the filter. */
  protected toggle(projectId: number): void {
    this.store.filter.update((f) => (f.projectId === projectId ? {} : { projectId }));
  }

  protected create(name: string): void {
    if (!name.trim()) return;
    this.store.addProject(name.trim());
    this.adding.set(false);
  }

  protected rename(id: number, name: string): void {
    if (name.trim()) this.store.renameProject(id, name.trim());
    this.editingId.set(null);
  }
}
