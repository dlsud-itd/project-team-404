import { CdkDrag, CdkDragHandle, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { NameColorEditor } from '../components/name-color-editor/name-color-editor';
import { LabelsService } from '../services/labels.service';
import { NO_COLOR, type LabelSetting, type NameAndColor } from '../types/settings.types';
import { moveFocusTarget, moveItem, taskCountLabel } from '../utils/reorder.util';

export const LABEL_REORDER_FAILED_MESSAGE =
  "Couldn't save the new label order. It has been put back.";

/** /settings/labels: the user's labels, in their order, with archive and restore. */
@Component({
  selector: 'app-label-settings',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, NameColorEditor],
  templateUrl: './label-settings.html',
  styleUrl: '../components/settings-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelSettings {
  private readonly api = inject(LabelsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly createEditor = viewChild<NameColorEditor>('createEditor');

  protected readonly labels = signal<LabelSetting[]>([]);
  protected readonly archived = signal<LabelSetting[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly editError = signal<string | null>(null);
  /** Labels with an archive or restore request in flight. */
  protected readonly busyIds = signal<ReadonlySet<number>>(new Set());

  protected readonly pendingDelete = signal<LabelSetting | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  /** Read out by screen readers after a move. */
  protected readonly announcement = signal('');

  private readonly allNames = computed(() =>
    [...this.labels(), ...this.archived()].map((label) => ({ id: label.id, name: label.name })),
  );
  protected readonly countLabel = taskCountLabel;
  protected readonly noColor = NO_COLOR;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin([this.api.list(false), this.api.list(true)])
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([active, archived]) => {
          this.labels.set(active);
          this.archived.set(archived);
        },
        error: () => this.loadError.set("Couldn't load your labels."),
      });
  }

  /** Names a label may not take: every other label's, archived ones included. */
  protected takenNames(exceptId: number | null): string[] {
    return this.allNames()
      .filter((label) => label.id !== exceptId)
      .map((label) => label.name);
  }

  protected create(input: NameAndColor): void {
    this.creating.set(true);
    this.createError.set(null);
    this.api
      .create(input)
      .pipe(
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (label) => {
          this.labels.update((labels) => [...labels, label]);
          this.createEditor()?.reset();
          this.announcement.set(`Label “${label.name}” created.`);
        },
        error: (error: unknown) => this.createError.set(saveError(error, input.name)),
      });
  }

  protected startEdit(label: LabelSetting): void {
    this.editError.set(null);
    this.editingId.set(label.id);
  }

  protected cancelEdit(): void {
    const id = this.editingId();
    this.editingId.set(null);
    this.editError.set(null);
    if (id !== null) this.focusAfterRender(`label-${id}-edit`);
  }

  protected saveEdit(label: LabelSetting, input: NameAndColor): void {
    this.saving.set(true);
    this.editError.set(null);
    this.api
      .update(label.id, input)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.labels.update((labels) =>
            labels.map((item) =>
              item.id === updated.id
                ? { ...updated, taskCount: updated.taskCount ?? item.taskCount }
                : item,
            ),
          );
          this.editingId.set(null);
          this.focusAfterRender(`label-${label.id}-edit`);
        },
        error: (error: unknown) => this.editError.set(saveError(error, input.name)),
      });
  }

  protected drop(event: CdkDragDrop<LabelSetting[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  protected move(label: LabelSetting, delta: -1 | 1): void {
    const from = this.labels().findIndex((item) => item.id === label.id);
    if (!this.reorder(from, from + delta)) return;
    this.focusAfterRender(
      `label-${label.id}-${moveFocusTarget(from + delta, this.labels().length, delta)}`,
    );
  }

  /** Moves a label, saves the order, and puts it back with a toast if saving fails. */
  private reorder(from: number, to: number): boolean {
    const previous = this.labels();
    const next = moveItem(previous, from, to);
    if (!next) return false;
    this.labels.set(next.map((label, index) => ({ ...label, sortOrder: index })));
    const moved = next[to];
    this.announcement.set(`${moved.name} moved to position ${to + 1} of ${next.length}.`);
    this.api
      .reorder(next.map((label) => label.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.labels.set(previous);
          this.toast.error(LABEL_REORDER_FAILED_MESSAGE);
        },
      });
    return true;
  }

  protected isBusy(label: LabelSetting): boolean {
    return this.busyIds().has(label.id);
  }

  protected setArchived(label: LabelSetting, isArchived: boolean): void {
    if (this.isBusy(label)) return;
    this.setBusy(label.id, true);
    this.api
      .setArchived(label.id, isArchived)
      .pipe(
        finalize(() => this.setBusy(label.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          const result = { ...updated, taskCount: updated.taskCount ?? label.taskCount };
          if (isArchived) {
            this.labels.update((labels) => labels.filter((item) => item.id !== label.id));
            this.archived.update((labels) => [...labels, result]);
            this.announcement.set(`Label “${label.name}” archived.`);
          } else {
            this.archived.update((labels) => labels.filter((item) => item.id !== label.id));
            this.labels.update((labels) => [...labels, result]);
            this.announcement.set(`Label “${label.name}” restored.`);
          }
        },
        error: () =>
          this.toast.error(
            isArchived
              ? `Couldn't archive “${label.name}”. Please try again.`
              : `Couldn't restore “${label.name}”. Please try again.`,
          ),
      });
  }

  protected askDelete(label: LabelSetting): void {
    this.deleteError.set(null);
    this.pendingDelete.set(label);
    this.focusAfterRender('delete-label-cancel');
  }

  protected cancelDelete(): void {
    const label = this.pendingDelete();
    this.pendingDelete.set(null);
    if (label) this.focusAfterRender(`label-${label.id}-delete`);
  }

  /** What the confirm dialog says happens to the label's tasks. */
  protected deleteImpact(label: LabelSetting): string {
    if (label.taskCount === null) return 'Any tasks that use it will lose this label.';
    if (label.taskCount === 0) return 'No tasks use this label.';
    return `${taskCountLabel(label.taskCount)} will lose this label.`;
  }

  protected confirmDelete(): void {
    const label = this.pendingDelete();
    if (!label || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.api
      .delete(label.id)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.labels.update((labels) => labels.filter((item) => item.id !== label.id));
          this.archived.update((labels) => labels.filter((item) => item.id !== label.id));
          this.pendingDelete.set(null);
          this.announcement.set(`Label “${label.name}” deleted.`);
        },
        error: () => this.deleteError.set("Couldn't delete the label. Please try again."),
      });
  }

  private setBusy(id: number, busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
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
    return `Label “${name}” already exists.`;
  }
  return "Couldn't save the label. Please try again.";
}
