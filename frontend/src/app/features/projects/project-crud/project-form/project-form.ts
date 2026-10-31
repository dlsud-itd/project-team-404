import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  type CreateProjectRequest,
  type Project,
  type ProjectField,
  type UpdateProjectRequest,
} from '../../shared/types/project.types';
import { ProjectsStore } from '../../shared/state/projects.store';
import { mapProjectError } from '../mappers/project-error.mapper';
import { ProjectService } from '../services/project.service';
import { isReadOnlyProject } from '../utils/project-permissions.util';
import { projectNameValidator } from '../validators/project-name.validator';

export type ProjectFormMode = 'create' | 'edit';

/** The colors a user can pick. The picker only offers these (plus a project's current color). */
export const PROJECT_COLORS: readonly { value: string; label: string }[] = [
  { value: '#DC2626', label: 'Red' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#CA8A04', label: 'Yellow' },
  { value: '#16A34A', label: 'Green' },
  { value: '#0D9488', label: 'Teal' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Violet' },
  { value: '#DB2777', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
];

const HEX_COLOR = /^(#[0-9A-Fa-f]{6})?$/;

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
  host: {
    '[class.in-dialog]': 'dialog()',
    '(document:keydown.escape)': 'dialog() && cancel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectForm {
  private readonly projects = inject(ProjectService);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute).snapshot;

  /** True inside the new-project popup, which creates; `closed` then replaces navigating away. */
  readonly dialog = input(false);
  readonly closed = output<void>();

  /** The `projects/:projectId/edit` route edits; without its data, the form creates. */
  protected readonly mode: ProjectFormMode = this.route.data['mode'] === 'edit' ? 'edit' : 'create';
  private readonly projectId = Number(this.route.paramMap.get('projectId'));

  protected readonly nameMax = PROJECT_NAME_MAX_LENGTH;
  protected readonly descriptionMax = PROJECT_DESCRIPTION_MAX_LENGTH;

  /** The project being edited, as last saved. */
  protected readonly project = signal<Project | null>(null);
  protected readonly loadState = signal<LoadState>(this.mode === 'edit' ? 'loading' : 'ready');
  protected readonly readOnly = computed(() => {
    const project = this.project();
    return project !== null && isReadOnlyProject(project);
  });

  protected readonly colors = computed(() => {
    const current = this.project()?.color;
    const known = PROJECT_COLORS.some((c) => c.value.toLowerCase() === current?.toLowerCase());
    return current && !known
      ? [...PROJECT_COLORS, { value: current, label: 'Current color' }]
      : PROJECT_COLORS;
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<ProjectField, string>>>({});

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', projectNameValidator],
    description: ['', Validators.maxLength(PROJECT_DESCRIPTION_MAX_LENGTH)],
    color: ['', Validators.pattern(HEX_COLOR)],
  });

  constructor() {
    if (this.mode === 'edit') this.load();
  }

  protected load(): void {
    if (!Number.isInteger(this.projectId) || this.projectId <= 0) {
      this.loadState.set('not-found');
      return;
    }
    this.loadState.set('loading');
    this.projects
      .get(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.form.reset({
            name: project.name,
            description: project.description ?? '',
            color: project.color ?? '',
          });
          this.loadState.set('ready');
        },
        error: (error: unknown) =>
          this.loadState.set(mapProjectError(error).notFound ? 'not-found' : 'error'),
      });
  }

  /** In edit mode, Save stays off until something actually changed. */
  protected canSave(): boolean {
    if (this.submitting()) return false;
    return this.mode === 'create' || Object.keys(this.changes()).length > 0;
  }

  protected submit(): void {
    if (this.submitting() || this.readOnly()) return;
    this.formError.set(null);
    this.saved.set(null);
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.mode === 'create') this.create();
    else this.update();
  }

  protected cancel(): void {
    if (this.submitting()) return;
    if (this.dialog()) this.closed.emit();
    else void this.router.navigateByUrl('/projects');
  }

  protected clearServerError(field: ProjectField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  /** Message for a field, or null. Length errors show while typing; required only after leaving. */
  protected fieldError(field: ProjectField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) return null;

    if (errors['required']) return control.touched ? 'Project name is required.' : null;
    if (errors['maxlength']) {
      const max = field === 'name' ? PROJECT_NAME_MAX_LENGTH : PROJECT_DESCRIPTION_MAX_LENGTH;
      return `Use ${max} characters or fewer.`;
    }
    if (errors['pattern']) return 'Pick one of the colors shown.';
    return null;
  }

  /** The form's values as the API expects them: trimmed, with empty optional fields as null. */
  private values(): CreateProjectRequest {
    const { name, description, color } = this.form.getRawValue();
    return {
      name: name.trim(),
      description: description.trim() || null,
      color: color || null,
    };
  }

  private changes(): UpdateProjectRequest {
    const project = this.project();
    if (!project) return {};
    const values = this.values();
    const changes: UpdateProjectRequest = {};
    if (values.name !== project.name) changes.name = values.name;
    if (values.description !== project.description) changes.description = values.description;
    if (values.color?.toLowerCase() !== project.color?.toLowerCase()) changes.color = values.color;
    return changes;
  }

  private create(): void {
    this.submitting.set(true);
    this.projects
      .create(this.values())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.closed.emit(),
        error: (error: unknown) => this.showError(error),
      });
  }

  private update(): void {
    const project = this.project();
    const changes = this.changes();
    if (!project || Object.keys(changes).length === 0) return;

    this.submitting.set(true);
    this.projects
      .update(project.projectId, changes)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.project.set(updated);
          this.form.reset({
            name: updated.name,
            description: updated.description ?? '',
            color: updated.color ?? '',
          });
          this.saved.set('Changes saved.');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Shows a failed save next to the field it is about; the user's input is kept. */
  private showError(error: unknown): void {
    const { message, field, notFound } = mapProjectError(error);
    if (notFound) {
      // The projects list may render after a tab redirect, so preserve the notice in its store.
      this.projectsStore.setNavigationError(message);
      void this.router.navigateByUrl('/projects', { state: { error: message } });
      return;
    }
    if (field) this.serverErrors.set({ [field]: message });
    else this.formError.set(message);
  }
}
