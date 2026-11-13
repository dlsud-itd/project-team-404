import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LabelService, type Label } from '../task-organization/services/label.service';

@Component({
  selector: 'app-label-management',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/home?tab=tasks">← Tasks</a>
      <h1>Manage labels</h1>
      @if (error(); as message) {
        <p role="alert">{{ message }}</p>
      }
      @if (loading()) {
        <p role="status">Loading labels…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <label for="label-name">Name</label>
          <input id="label-name" formControlName="name" maxlength="50" />
          <label for="label-color">Color</label>
          <input id="label-color" type="color" formControlName="color" />
          <button type="submit" [disabled]="busy() || form.invalid">
            {{ editing() ? 'Save label' : 'Create label' }}
          </button>
          @if (editing()) {
            <button type="button" [disabled]="busy()" (click)="cancelEdit()">Cancel</button>
          }
        </form>

        <ul aria-label="Labels">
          @for (label of labels(); track label.labelId) {
            <li>
              <span class="swatch" [style.background-color]="label.color ?? '#d6d3d1'"></span>
              <span>{{ label.name }}</span>
              <button type="button" [disabled]="busy()" [attr.aria-label]="'Edit ' + label.name" (click)="edit(label)">Edit {{ label.name }}</button>
              <button type="button" [disabled]="busy()" [attr.aria-label]="'Delete ' + label.name" (click)="askDelete(label)">Delete {{ label.name }}</button>
            </li>
          } @empty {
            <li>No labels yet.</li>
          }
        </ul>
      }

      @if (pendingDelete(); as label) {
        <section role="dialog" aria-modal="true" [attr.aria-label]="'Delete ' + label.name">
          <p>Delete label “{{ label.name }}”?</p>
          <button type="button" [disabled]="busy()" (click)="confirmDelete()">Delete label</button>
          <button type="button" [disabled]="busy()" (click)="pendingDelete.set(null)">Cancel</button>
        </section>
      }
    </main>
  `,
  styles: `
    .page { max-width: 48rem; margin: 0 auto; padding: 2rem; }
    form, li { display: flex; align-items: center; gap: 0.75rem; margin-block: 0.75rem; }
    ul { padding: 0; list-style: none; }
    .swatch { width: 1rem; height: 1rem; border-radius: 50%; }
    [role='alert'] { color: #b91c1c; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelManagement {
  private readonly service = inject(LabelService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly labels = signal<Label[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<number | null>(null);
  protected readonly pendingDelete = signal<Label | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    color: ['#2563EB'],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .list()
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => this.labels.set(labels),
        error: () => this.error.set('Could not load labels. Please try again.'),
      });
  }

  protected edit(label: Label): void {
    this.editing.set(label.labelId);
    this.form.setValue({ name: label.name, color: label.color ?? '#2563EB' });
    this.error.set(null);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.form.reset({ name: '', color: '#2563EB' });
  }

  protected save(): void {
    if (this.busy() || this.form.invalid) return;
    const value = this.form.getRawValue();
    const input = { name: value.name.trim(), color: value.color || null };
    const labelId = this.editing();
    this.busy.set(true);
    this.error.set(null);
    (labelId === null ? this.service.create(input) : this.service.update(labelId, input))
      .pipe(finalize(() => this.busy.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (label) => {
          this.labels.update((labels) =>
            labelId === null
              ? [...labels, label].sort((a, b) => a.name.localeCompare(b.name))
              : labels.map((item) => (item.labelId === label.labelId ? label : item)),
          );
          this.cancelEdit();
        },
        error: (error: unknown) => this.error.set(labelError(error)),
      });
  }

  protected askDelete(label: Label): void {
    this.error.set(null);
    this.pendingDelete.set(label);
  }

  protected confirmDelete(): void {
    const label = this.pendingDelete();
    if (!label || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.service
      .delete(label.labelId)
      .pipe(finalize(() => this.busy.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.labels.update((labels) => labels.filter((item) => item.labelId !== label.labelId));
          this.pendingDelete.set(null);
        },
        error: () => this.error.set('Could not delete the label. Please try again.'),
      });
  }
}

function labelError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 409
  ) {
    return 'A label with this name already exists.';
  }
  return 'Could not save the label. Please try again.';
}
