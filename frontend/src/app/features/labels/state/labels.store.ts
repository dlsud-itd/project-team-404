import { Injectable, computed, signal } from '@angular/core';
import type { Label } from '../types/label.types';

/** Alphabetical, ignoring case, then by id so the order is stable. */
function byName(a: Label, b: Label): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.labelId - b.labelId;
}

/**
 * The signed-in user's labels, shared by the labels pages and the task label picker. It only
 * holds state; LabelService writes to it.
 */
@Injectable({ providedIn: 'root' })
export class LabelsStore {
  private readonly list = signal<Label[]>([]);

  /** Every label, alphabetically. */
  readonly labels = computed(() => [...this.list()].sort(byName));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** True once a list request has succeeded. */
  readonly loaded = signal(false);

  byId(labelId: number): Label | undefined {
    return this.list().find((l) => l.labelId === labelId);
  }

  startLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  setLabels(labels: Label[]): void {
    this.list.set(labels);
    this.loading.set(false);
    this.loaded.set(true);
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  /** Adds a label, or replaces the one with the same id. */
  upsert(label: Label): void {
    this.list.update((list) =>
      list.some((l) => l.labelId === label.labelId)
        ? list.map((l) => (l.labelId === label.labelId ? label : l))
        : [...list, label],
    );
  }

  remove(labelId: number): void {
    this.list.update((list) => list.filter((l) => l.labelId !== labelId));
  }

  /** Forgets everything, e.g. when the user logs out. */
  reset(): void {
    this.list.set([]);
    this.loading.set(false);
    this.loaded.set(false);
    this.error.set(null);
  }
}
