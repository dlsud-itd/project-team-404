import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LabelChip } from '../components/label-chip/label-chip';
import { mapLabelError } from '../mappers/label-error.mapper';
import { LabelService } from '../services/label.service';
import { LabelsStore } from '../state/labels.store';
import {
  LABEL_COLORS,
  LABEL_NAME_MAX_LENGTH,
  type CreateLabelRequest,
  type Label,
  type LabelField,
  type UpdateLabelRequest,
} from '../types/label.types';
import { labelNameValidator, uniqueLabelNameValidator } from '../validators/label-name.validator';

export type LabelFormMode = 'create' | 'edit';

const HEX_COLOR = /^(#[0-9A-Fa-f]{6})?$/;

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/** Creates a label at /labels/new, or edits one at /labels/:labelId/edit. */
@Component({
  selector: 'app-label-form',
  imports: [ReactiveFormsModule, RouterLink, LabelChip],
  templateUrl: './label-form.html',
  styleUrl: './label-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelForm {
  private readonly labels = inject(LabelService);
  private readonly store = inject(LabelsStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute).snapshot;

  protected readonly mode: LabelFormMode = this.route.data['mode'] === 'edit' ? 'edit' : 'create';
  private readonly labelId = Number(this.route.paramMap.get('labelId'));

  protected readonly nameMax = LABEL_NAME_MAX_LENGTH;
  protected readonly colors = LABEL_COLORS;

  /** The label being edited, as last saved. */
  protected readonly label = signal<Label | null>(null);
  protected readonly loadState = signal<LoadState>(this.mode === 'edit' ? 'loading' : 'ready');

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<LabelField, string>>>({});

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      '',
      [
        labelNameValidator,
        uniqueLabelNameValidator(
          () => this.store.labels(),
          () => this.label()?.labelId ?? null,
        ),
      ],
    ],
    color: ['', Validators.pattern(HEX_COLOR)],
  });

  constructor() {
    // The duplicate-name check needs the user's labels; failure only loses that early warning.
    if (!this.store.loaded() && !this.store.loading()) {
      this.labels
        .refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }
    if (this.mode === 'edit') this.load();
  }

  protected load(): void {
    if (!Number.isInteger(this.labelId) || this.labelId <= 0) {
      this.loadState.set('not-found');
      return;
    }
    this.loadState.set('loading');
    this.labels
      .get(this.labelId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (label) => {
          this.label.set(label);
          this.form.reset({ name: label.name, color: label.color ?? '' });
          this.loadState.set('ready');
        },
        error: (error: unknown) =>
          this.loadState.set(mapLabelError(error).notFound ? 'not-found' : 'error'),
      });
  }

  /** What the label will look like, for the preview chip. */
  protected preview(): Label {
    const { name, color } = this.form.getRawValue();
    return {
      labelId: this.label()?.labelId ?? 0,
      name: name.trim() || 'Label',
      color: color || null,
    };
  }

  /** In edit mode, Save stays off until something actually changed. */
  protected canSave(): boolean {
    if (this.submitting()) return false;
    return this.mode === 'create' || Object.keys(this.changes()).length > 0;
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set(null);
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.mode === 'create') this.create();
    else this.update();
  }

  protected cancel(): void {
    if (!this.submitting()) void this.router.navigateByUrl('/labels');
  }

  protected clearServerError(field: LabelField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  /** Message for a field, or null. Length and duplicate errors show while typing. */
  protected fieldError(field: LabelField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) return null;

    if (errors['required']) return control.touched ? 'Label name is required.' : null;
    if (errors['maxlength']) return `Use ${LABEL_NAME_MAX_LENGTH} characters or fewer.`;
    if (errors['nameTaken']) return 'You already have a label with this name.';
    if (errors['pattern']) return 'Pick one of the colors shown.';
    return null;
  }

  private values(): CreateLabelRequest {
    const { name, color } = this.form.getRawValue();
    return { name: name.trim(), color: color || null };
  }

  private changes(): UpdateLabelRequest {
    const label = this.label();
    if (!label) return {};
    const values = this.values();
    const changes: UpdateLabelRequest = {};
    if (values.name !== label.name) changes.name = values.name;
    if (values.color?.toLowerCase() !== label.color?.toLowerCase()) changes.color = values.color;
    return changes;
  }

  private create(): void {
    this.submitting.set(true);
    this.labels
      .create(this.values())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/labels'),
        error: (error: unknown) => this.showError(error),
      });
  }

  private update(): void {
    const label = this.label();
    const changes = this.changes();
    if (!label || Object.keys(changes).length === 0) return;

    this.submitting.set(true);
    this.labels
      .update(label.labelId, changes)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/labels'),
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Shows a failed save next to the field it is about; the user's input is kept. */
  private showError(error: unknown): void {
    const { message, field, notFound } = mapLabelError(error);
    if (notFound) {
      this.formError.set(message);
      // The list is out of date; reload it so the missing label disappears.
      this.labels.refresh().subscribe({ error: () => {} });
      return;
    }
    if (field) this.serverErrors.set({ [field]: message });
    else this.formError.set(message);
  }
}
