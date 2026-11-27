import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../../shared/services/toast.service';
import { ArchiveUndoService } from '../../../../archive/services/archive-undo.service';
import { SettingsStore } from '../../../../settings/state/settings.store';
import { mapProjectError } from '../../mappers/project-error.mapper';
import { ProjectOrganizationService } from '../../../project-organization/services/project-organization.service';
import { ProjectsStore } from '../../../shared/state/projects.store';
import type { Project } from '../../../shared/types/project.types';
import { projectPermissions } from '../../utils/project-permissions.util';

/**
 * One project on the Projects page: its name (with its color as a small dot), a favorite star,
 * and a ⋯ menu with Edit, "Set as default project" and Archive. Projects are deleted for good
 * only from the Archive page.
 */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  template: `
    <article class="card" [class.inbox]="project().isInbox">
      <span class="dot" [style.background]="project().color ?? null" aria-hidden="true"></span>

      <div class="body">
        <h3 class="name">
          <a class="tasks-link" [routerLink]="['/projects', project().projectId, 'tasks']">{{
            project().name
          }}</a>
          @if (project().isInbox) {
            <span class="badge">Read-only</span>
          }
          @if (isDefault()) {
            <span class="badge" title="New tasks go here">Default</span>
          }
        </h3>
        @if (project().description; as description) {
          <p class="description">{{ description }}</p>
        }
      </div>

      <div class="actions">
        @if (!project().isInbox) {
          <button
            type="button"
            class="icon star"
            [class.on]="project().isFavorite"
            [attr.aria-pressed]="project().isFavorite"
            [attr.aria-label]="(project().isFavorite ? 'Unstar ' : 'Star ') + project().name"
            [title]="project().isFavorite ? 'Remove from dashboard' : 'Pin to dashboard'"
            [disabled]="starring()"
            (click)="toggleFavorite()"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
            </svg>
          </button>
        }
        <button
          type="button"
          class="icon more"
          [attr.aria-label]="'More actions for ' + project().name"
          title="More actions"
          [cdkMenuTriggerFor]="menu"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="3.5" cy="8" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="12.5" cy="8" r="1.25" />
          </svg>
        </button>
      </div>
    </article>

    <ng-template #menu>
      <div class="menu" cdkMenu [attr.aria-label]="'Actions for ' + project().name">
        @if (permissions().canEdit) {
          <button type="button" class="item" cdkMenuItem (cdkMenuItemTriggered)="edit()">
            Edit
          </button>
        }
        <button
          type="button"
          class="item"
          cdkMenuItem
          [cdkMenuItemDisabled]="isDefault()"
          (cdkMenuItemTriggered)="setAsDefault()"
        >
          {{ isDefault() ? 'Default project' : 'Set as default project' }}
        </button>
        @if (permissions().canEdit) {
          <div class="separator" role="separator"></div>
          <button type="button" class="item" cdkMenuItem (cdkMenuItemTriggered)="archive()">
            <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="5" rx="1" />
              <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
            </svg>
            Archive
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.75rem 0.75rem 1rem;
      border-radius: 0.5rem;
      background: var(--theme-surface);
      color: var(--theme-text);
      box-shadow: var(--elevation-1);
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover {
        background: color-mix(in srgb, var(--theme-surface), var(--theme-text) 3%);
      }
    }
    .inbox {
      box-shadow: inset 0 0 0 1px var(--divider);
      background: transparent;
    }
    /* A project's color only ever shows as this dot. */
    .dot {
      flex-shrink: 0;
      width: 0.625rem;
      height: 0.625rem;
      margin-top: 0.375rem;
      border-radius: 50%;
      background: var(--ink-muted);
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
        text-underline-offset: 0.15em;
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
    .badge {
      padding: 0.0625rem 0.5rem;
      border-radius: 0.5rem;
      background: var(--active-bg);
      color: var(--ink-muted);
      font-size: 0.6875rem;
      font-weight: 600;
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
      gap: 0.125rem;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: var(--ink-muted);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);
      svg {
        width: 1rem;
        height: 1rem;
        fill: currentColor;
      }
      &:hover,
      &[aria-expanded='true'] {
        background: var(--hover-bg);
        color: var(--ink);
      }
      &:disabled {
        cursor: progress;
        opacity: 0.6;
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 1px;
      }
      @media (pointer: coarse) {
        width: 2.5rem;
        height: 2.5rem;
      }
    }
    .star svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.3;
      stroke-linejoin: round;
    }
    /* A starred project uses the one accent color rather than a separate yellow. */
    .star.on {
      color: var(--theme-primary);
      svg {
        fill: currentColor;
      }
    }
    .menu {
      min-width: 13rem;
      padding: 0.25rem;
      border-radius: 0.5rem;
      background: var(--theme-surface);
      box-shadow: var(--elevation-2);
    }
    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: 0;
      border-radius: 0.25rem;
      background: none;
      color: var(--ink);
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);
      &:hover,
      &:focus {
        background: var(--hover-bg);
        outline: none;
      }
      &.cdk-keyboard-focused {
        outline: 2px solid var(--theme-primary);
        outline-offset: -2px;
      }
      &[aria-disabled='true'] {
        color: var(--ink-muted);
        cursor: default;
      }
    }
    .glyph {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .separator {
      height: 1px;
      margin: 0.25rem 0.375rem;
      background: var(--divider);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  readonly project = input.required<Project>();

  private readonly store = inject(ProjectsStore);
  private readonly settings = inject(SettingsStore);
  private readonly organization = inject(ProjectOrganizationService);
  private readonly archiveUndo = inject(ArchiveUndoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly permissions = computed(() => projectPermissions(this.project()));
  /** Whether new tasks go to this project; the Inbox is the default until another is chosen. */
  protected readonly isDefault = computed(
    () => this.store.defaultProject()?.projectId === this.project().projectId,
  );
  protected readonly starring = signal(false);

  /** Starred projects are the ones pinned to the dashboard. */
  protected toggleFavorite(): void {
    const project = this.project();
    const isFavorite = !project.isFavorite;
    this.starring.set(true);
    this.organization.setFavorite(project, isFavorite).subscribe({
      next: () => this.starring.set(false),
      error: (error: unknown) => {
        this.starring.set(false);
        this.toast.error(`Your change wasn't saved. ${mapProjectError(error).message}`);
      },
    });
  }

  protected edit(): void {
    void this.router.navigate(['/projects', this.project().projectId, 'edit']);
  }

  protected setAsDefault(): void {
    const project = this.project();
    // The Inbox is the fallback, so choosing it clears the setting.
    const defaultProjectId = project.isInbox ? null : project.projectId;
    this.settings.save({ defaultProjectId }).subscribe({
      next: () => this.toast.info(`New tasks will go to “${project.name}”.`),
      error: () =>
        this.toast.error(`Couldn't make “${project.name}” the default. Please try again.`),
    });
  }

  /** Archiving takes the project off the page at once and offers Undo for 5 seconds. */
  protected archive(): void {
    const project = this.project();
    this.archiveUndo.archive({ kind: 'project', id: project.projectId, name: project.name });
  }
}
