import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Project } from '../../../shared/types/project.types';
import { projectPermissions } from '../../utils/project-permissions.util';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink],
  template: `
    <article class="card" [class.inbox]="project().isInbox">
      <span class="swatch" [style.background]="project().color ?? null" aria-hidden="true"></span>

      <div class="body">
        <h3 class="name">
          <a class="tasks-link" [routerLink]="['/projects', project().projectId, 'tasks']">{{
            project().name
          }}</a>
          @if (project().isInbox) {
            <span class="badge">Read-only</span>
          }
          @if (project().isFavorite) {
            <span class="favorite" aria-label="Favorite">★</span>
          }
        </h3>
        @if (project().description; as description) {
          <p class="description">{{ description }}</p>
        }
      </div>

      @if (permissions().canEdit || permissions().canDelete) {
        <div class="actions">
          @if (permissions().canEdit) {
            <a
              class="action edit"
              [routerLink]="['/projects', project().projectId, 'edit']"
              [attr.aria-label]="'Edit ' + project().name"
              >Edit</a
            >
          }
          @if (permissions().canDelete) {
            <button
              type="button"
              class="action delete"
              [attr.aria-label]="'Delete ' + project().name"
              (click)="deleteRequested.emit(project())"
            >
              Delete
            </button>
          }
        </div>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border: 1px solid var(--orange-light);
      border-radius: 0.75rem;
      background: #fff;
    }
    .inbox {
      border-style: dashed;
      background: #fff8f4;
    }
    .swatch {
      flex-shrink: 0;
      width: 0.875rem;
      height: 0.875rem;
      margin-top: 0.1875rem;
      border: 1px solid rgb(0 0 0 / 0.15);
      border-radius: 3px;
      background: #e6dcd7;
    }
    .body {
      flex: 1;
      min-width: 0;
    }
    .name {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .tasks-link {
      color: inherit;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .badge {
      padding: 0.0625rem 0.5rem;
      border-radius: 999px;
      background: #f3e2f7;
      color: #7b23a8;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .favorite {
      color: #e0a100;
    }
    .description {
      margin: 0.25rem 0 0;
      color: var(--ink-muted);
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.375rem;
    }
    .action {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--field-border);
      border-radius: 999px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      &:hover {
        background: #fdeee6;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .delete {
      border-color: var(--error);
      color: var(--error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  readonly project = input.required<Project>();
  readonly deleteRequested = output<Project>();

  protected readonly permissions = computed(() => projectPermissions(this.project()));
}
