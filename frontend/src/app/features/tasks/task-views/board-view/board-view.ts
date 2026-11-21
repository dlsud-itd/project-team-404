import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { ArchiveUndoService } from '../../../archive/services/archive-undo.service';
import { mapTaskError, notDueAvailableOn } from '../../task-crud/mappers/task-error.mapper';
import { TaskService } from '../../task-crud/services/task.service';
import { BoardColumn } from './components/board-column/board-column';
import { TaskBoardService } from './services/task-board.service';
import type {
  BoardCard,
  BoardColumnKey,
  BoardFilter,
  BoardMove,
  BoardState,
} from './types/task-board.types';
import {
  BOARD_COLUMNS,
  findCard,
  fullColumnOrder,
  moveAnnouncement,
  moveCard,
} from './utils/board-move.util';

export const BOARD_CONFLICT_MESSAGE = 'The board changed elsewhere, so it was reloaded.';

/**
 * A project's tasks as a Kanban board: To Do, In Progress and Done. Cards move by dragging or
 * with each card's Move menu; the move shows at once and is put back if saving fails.
 */
@Component({
  selector: 'app-board-view',
  imports: [CdkDropListGroup, CdkScrollable, BoardColumn],
  templateUrl: './board-view.html',
  styleUrl: './board-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardView {
  readonly projectId = input.required<number>();
  /** A new filter object reloads the board, even when its values are unchanged. */
  readonly filter = input.required<BoardFilter>();
  /** Whether filters hide part of the board; moves then save against the full columns. */
  readonly filtersActive = input(false);

  /** A load failed; the page may drop filters the server refused. */
  readonly loadFailed = output<unknown>();
  readonly clearFilters = output<void>();
  readonly newTask = output<void>();

  private readonly api = inject(TaskBoardService);
  private readonly tasks = inject(TaskService);
  private readonly toast = inject(ToastService);
  private readonly archiveUndo = inject(ArchiveUndoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly columns = BOARD_COLUMNS;
  protected readonly board = signal<BoardState | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True while a move is saving; further moves wait so each one saves against fresh columns. */
  protected readonly saving = signal(false);
  /** Read out by screen readers after a move. */
  protected readonly announcement = signal('');
  protected readonly doneCollapsed = signal(false);

  protected readonly isEmpty = computed(() => {
    const board = this.board();
    return !!board && BOARD_COLUMNS.every((column) => board.columns[column].length === 0);
  });

  /** Each load replaces the one before it, so a slow old answer never overwrites a newer one. */
  private readonly loads = new Subject<{ silent: boolean }>();
  private shownProjectId: number | null = null;

  constructor() {
    this.loads
      .pipe(
        switchMap(({ silent }) => {
          if (!silent) this.loading.set(true);
          return this.api.load(this.projectId(), this.filter()).pipe(
            tap(() => this.error.set(null)),
            catchError((error: unknown) => {
              this.error.set(mapTaskError(error).message);
              this.loadFailed.emit(error);
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((board) => this.board.set(board));

    effect(() => {
      const projectId = this.projectId();
      this.filter();
      untracked(() => {
        if (projectId !== this.shownProjectId) {
          this.shownProjectId = projectId;
          this.board.set(null);
        }
        this.reload();
      });
    });
  }

  /** Loads the board; a silent reload keeps the current board on screen until it answers. */
  protected reload(silent = false): void {
    this.loads.next({ silent });
  }

  protected toggleDone(): void {
    this.doneCollapsed.update((collapsed) => !collapsed);
  }

  protected move({ taskId, to, index, fromMenu }: BoardMove): void {
    const before = this.board();
    if (!before || this.saving()) return;
    const from = findCard(before, taskId);
    const after = from && moveCard(before, taskId, to, index);
    if (!from || !after) return;

    const card = before.columns[from.column][from.index];
    this.board.set(after);
    this.saving.set(true);
    this.announcement.set(moveAnnouncement(after, taskId, card.title));
    if (fromMenu) this.focusMoveButton(taskId);

    const projectId = this.projectId();
    this.columnOrder(projectId, to, after, taskId)
      .pipe(
        switchMap((taskIds) => this.api.reorder(projectId, to, taskIds)),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.moved(card, from.column, to),
        error: (error: unknown) => this.moveFailed(error, card, before, after),
      });
  }

  /** Takes the card off the board at once; a failure or Undo puts it back. */
  protected archive(card: BoardCard): void {
    const before = this.board();
    if (!before) return;
    const from = findCard(before, card.taskId);
    if (!from) return;
    const after: BoardState = {
      columns: {
        ...before.columns,
        [from.column]: before.columns[from.column].filter((item) => item.taskId !== card.taskId),
      },
      counts: { ...before.counts, [from.column]: Math.max(before.counts[from.column] - 1, 0) },
    };

    this.archiveUndo.archive(
      { kind: 'task', id: card.taskId, name: card.title },
      {
        apply: () => {
          this.board.set(after);
          this.announcement.set(`“${card.title}” was archived.`);
        },
        rollback: () => {
          // Only put the card back if nothing has replaced the board since, e.g. a reload.
          if (this.board() === after) this.board.set(before);
          else this.reload(true);
        },
      },
    );
  }

  /**
   * The ids to save for the target column. The server needs the whole column, so when filters
   * hide part of it the unfiltered board is fetched and the card placed next to its neighbours.
   */
  private columnOrder(
    projectId: number,
    column: BoardColumnKey,
    board: BoardState,
    taskId: number,
  ): Observable<number[]> {
    const visibleIds = board.columns[column].map((card) => card.taskId);
    if (!this.filtersActive()) return of(visibleIds);
    return this.api.get(projectId).pipe(
      map((full) =>
        fullColumnOrder(
          full.columns[column].map((task) => task.id),
          visibleIds,
          taskId,
        ),
      ),
    );
  }

  private moved(card: BoardCard, from: BoardColumnKey, to: BoardColumnKey): void {
    const completed = to === 'done';
    if (completed === (from === 'done')) return;
    this.tasks.announceCompletion({
      taskId: card.taskId,
      completedAt: completed ? new Date().toISOString() : null,
    });
    // Completing a repeating task makes its next occurrence, which the server puts in To Do.
    if (completed && (card.task?.isRecurring ?? true)) this.reload(true);
  }

  private moveFailed(error: unknown, card: BoardCard, before: BoardState, after: BoardState): void {
    // Only put the card back if nothing has replaced the board since, e.g. a reload.
    if (this.board() === after) this.board.set(before);
    if (notDueAvailableOn(error)) {
      this.toast.info(mapTaskError(error).message);
      this.announcement.set(`“${card.title}” was not moved.`);
      return;
    }
    const stale =
      error instanceof HttpErrorResponse && (error.status === 409 || error.status === 404);
    if (stale) {
      this.toast.info(BOARD_CONFLICT_MESSAGE);
      this.reload(true);
    } else {
      this.toast.error(`Couldn't move “${card.title}”. It has been put back.`);
    }
    this.announcement.set(`“${card.title}” was not moved.`);
  }

  /** Keeps keyboard focus on a card moved with its menu, which re-renders in its new place. */
  private focusMoveButton(taskId: number): void {
    afterNextRender(
      () =>
        this.host.nativeElement.querySelector<HTMLElement>(`#board-card-${taskId}-move`)?.focus(),
      { injector: this.injector },
    );
  }
}
