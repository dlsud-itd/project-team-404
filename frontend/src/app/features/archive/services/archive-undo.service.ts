import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../../shared/services/toast.service';
import {
  PROJECT_LIMIT_MESSAGE,
  isProjectLimitError,
} from '../../projects/project-crud/mappers/project-error.mapper';
import type { ArchiveTarget } from '../types/archive.types';
import {
  archiveFailedToast,
  archivedToast,
  restoreFailedToast,
  restoredToast,
} from '../utils/archive-labels.util';
import { ArchiveService } from './archive.service';

/** How long the "archived" toast keeps its Undo button. */
export const UNDO_DURATION_MS = 5000;

/**
 * Callbacks a screen passes in so the change shows at once. `apply` takes the item out of
 * (or puts it back into) the screen's own list; `rollback` reverses `apply`.
 */
export interface ArchiveHooks {
  apply?: () => void;
  rollback?: () => void;
  /** Runs after the server confirmed the change. */
  done?: () => void;
  /** Runs after the server refused the change, once the rollback has run. */
  failed?: (error: unknown) => void;
}

export interface RestoreOptions extends ArchiveHooks {
  /** Shows "… restored" on success; off for an Undo, where the item simply reappears. */
  announce?: boolean;
}

/**
 * The archive flow every screen shares: change the screen first, send the request, then show
 * an Undo toast for 5 seconds. A failed request puts the screen back and shows an error toast.
 */
@Injectable({ providedIn: 'root' })
export class ArchiveUndoService {
  private readonly archive$ = inject(ArchiveService);
  private readonly toast = inject(ToastService);

  archive(target: ArchiveTarget, hooks: ArchiveHooks = {}): void {
    hooks.apply?.();
    this.archive$.archive(target.kind, target.id).subscribe({
      next: () => {
        hooks.done?.();
        this.offerUndo(target, () =>
          this.restore(target, { apply: hooks.rollback, rollback: hooks.apply }),
        );
      },
      error: (error: unknown) => {
        hooks.rollback?.();
        this.toast.error(archiveFailedToast(target.kind, target.name));
        hooks.failed?.(error);
      },
    });
  }

  restore(target: ArchiveTarget, { announce = false, ...hooks }: RestoreOptions = {}): void {
    hooks.apply?.();
    this.archive$.restore(target.kind, target.id).subscribe({
      next: () => {
        hooks.done?.();
        if (announce) this.toast.info(restoredToast(target.kind, target.name));
      },
      error: (error: unknown) => {
        hooks.rollback?.();
        // At the project limit the server says why; that beats a generic "couldn't restore".
        this.toast.error(
          isProjectLimitError(error)
            ? PROJECT_LIMIT_MESSAGE
            : restoreFailedToast(target.kind, target.name),
        );
        hooks.failed?.(error);
      },
    });
  }

  /** Shows "… archived" with an Undo button, for screens that archive through their own service. */
  offerUndo(target: ArchiveTarget, undo: () => void): void {
    this.toast.show(archivedToast(target.kind, target.name), {
      kind: 'warning',
      durationMs: UNDO_DURATION_MS,
      action: { label: 'Undo', run: undo },
    });
  }
}
