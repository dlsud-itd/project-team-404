import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LabelChip } from '../components/label-chip/label-chip';
import { mapLabelError } from '../mappers/label-error.mapper';
import { LabelService } from '../services/label.service';
import { LabelsStore } from '../state/labels.store';
import type { Label } from '../types/label.types';

/** Every label the user has, at /labels, with links to add, edit and delete them. */
@Component({
  selector: 'app-label-list',
  imports: [RouterLink, LabelChip],
  templateUrl: './label-list.html',
  styleUrl: './label-list.scss',
  host: { '(document:keydown.escape)': 'cancelDelete()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelList {
  protected readonly store = inject(LabelsStore);
  private readonly labels = inject(LabelService);
  private readonly destroyRef = inject(DestroyRef);

  /** True until the first list request settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  protected readonly pendingDelete = signal<Label | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.labels
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected askDelete(label: Label): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.deleteError.set(null);
    this.pendingDelete.set(label);
  }

  protected cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const label = this.pendingDelete();
    if (!label || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.labels
      .delete(label.labelId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.notice.set(`“${label.name}” was deleted.`);
        },
        error: (error: unknown) => {
          const { message, notFound } = mapLabelError(error);
          if (notFound) {
            // Already gone (e.g. deleted in another tab): close and show the real list.
            this.pendingDelete.set(null);
            this.actionError.set(message);
            this.load();
            return;
          }
          this.deleteError.set(message);
        },
      });
  }
}
