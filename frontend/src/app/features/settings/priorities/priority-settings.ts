import { CdkDrag, CdkDragHandle, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { NameColorEditor } from '../components/name-color-editor/name-color-editor';
import { PrioritiesStore } from '../state/priorities.store';
import { NO_COLOR, type NameAndColor, type PriorityLevel } from '../types/settings.types';
import { moveFocusTarget, moveItem, taskCountLabel } from '../utils/reorder.util';
import { DeletePriorityDialog } from './delete-priority-dialog/delete-priority-dialog';

/** /settings/priorities: the user's priority levels, their order, colors and default. */
@Component({
  selector: 'app-priority-settings',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NameColorEditor, DeletePriorityDialog],
  templateUrl: './priority-settings.html',
  styleUrl: '../components/settings-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrioritySettings {
  protected readonly store = inject(PrioritiesStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly createEditor = viewChild<NameColorEditor>('createEditor');

  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly defaultingId = signal<number | null>(null);

  protected readonly pendingDelete = signal<PriorityLevel | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly announcement = signal('');
  protected readonly countLabel = taskCountLabel;
  protected readonly noColor = NO_COLOR;

  constructor() {
    // Fresh task counts each time the page opens.
    this.store.load();
  }

  protected takenNames(exceptId: number | null): string[] {
    return this.store
      .levels()
      .filter((level) => level.id !== exceptId)
      .map((level) => level.name);
  }

  protected create(input: NameAndColor): void {
    this.creating.set(true);
    this.createError.set(null);
    this.store
      .create(input)
      .pipe(
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (level) => {
          this.createEditor()?.reset();
          this.announcement.set(`Priority “${level.name}” created.`);
        },
        error: (error: unknown) => this.createError.set(saveError(error, input.name)),
      });
  }

  protected startEdit(level: PriorityLevel): void {
    this.editError.set(null);
    this.editingId.set(level.id);
  }

  protected cancelEdit(): void {
    const id = this.editingId();
    this.editingId.set(null);
    this.editError.set(null);
    if (id !== null) this.focusAfterRender(`priority-${id}-edit`);
  }

  protected saveEdit(level: PriorityLevel, input: NameAndColor): void {
    this.saving.set(true);
    this.editError.set(null);
    this.store
      .update(level.id, input)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.focusAfterRender(`priority-${level.id}-edit`);
        },
        error: (error: unknown) => this.editError.set(saveError(error, input.name)),
      });
  }

  protected setDefault(level: PriorityLevel): void {
    if (this.defaultingId() !== null) return;
    this.defaultingId.set(level.id);
    this.store
      .setDefault(level.id)
      .pipe(
        finalize(() => this.defaultingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.announcement.set(`${level.name} is now the default priority.`);
          this.focusAfterRender(`priority-${level.id}-edit`);
        },
        error: () =>
          this.toast.error(`Couldn't make “${level.name}” the default. Please try again.`),
      });
  }

  protected drop(event: CdkDragDrop<PriorityLevel[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  protected move(level: PriorityLevel, delta: -1 | 1): void {
    const from = this.store.levels().findIndex((item) => item.id === level.id);
    if (!this.reorder(from, from + delta)) return;
    const target = moveFocusTarget(from + delta, this.store.levels().length, delta);
    this.focusAfterRender(`priority-${level.id}-${target}`);
  }

  /** The store shows the new order at once and rolls it back, with a toast, if saving fails. */
  private reorder(from: number, to: number): boolean {
    const next = moveItem(this.store.levels(), from, to);
    if (!next) return false;
    this.store.reorder(next.map((level) => level.id));
    this.announcement.set(`${next[to].name} moved to position ${to + 1} of ${next.length}.`);
    return true;
  }

  protected askDelete(level: PriorityLevel): void {
    this.deleteError.set(null);
    this.pendingDelete.set(level);
  }

  protected cancelDelete(): void {
    const level = this.pendingDelete();
    this.pendingDelete.set(null);
    if (level) this.focusAfterRender(`priority-${level.id}-delete`);
  }

  protected confirmDelete(reassignTo: number | null): void {
    const level = this.pendingDelete();
    if (!level || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.store
      .remove(level.id, reassignTo)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.announcement.set(`Priority “${level.name}” deleted.`);
        },
        error: (error: unknown) => this.deleteError.set(deleteError(error)),
      });
  }

  private focusAfterRender(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), {
      injector: this.injector,
    });
  }
}

function saveError(error: unknown, name: string): string {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return `Priority “${name}” already exists.`;
  }
  return "Couldn't save the priority. Please try again.";
}

function deleteError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    const message = (error.error as { error?: unknown } | null)?.error;
    return typeof message === 'string' && message
      ? message
      : "This level can't be deleted right now.";
  }
  return "Couldn't delete the priority. Please try again.";
}
