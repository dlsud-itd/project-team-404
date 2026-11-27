import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../../auth/session/session.service';
import { ProjectsStore } from '../../../../../projects/shared/state/projects.store';
import { PrioritiesStore } from '../../../../../settings/state/priorities.store';
import {
  formatDate,
  instantToDate,
  userTimeZone,
} from '../../../../task-scheduling/utils/date-format.util';
import { StreakBadge } from '../../../../task-streaks/components/streak-badge/streak-badge';
import type { BoardCard as BoardCardModel, BoardColumnKey } from '../../types/task-board.types';
import { BOARD_COLUMNS, BOARD_COLUMN_NAMES } from '../../utils/board-move.util';

/** How many labels a card shows before "+2". */
const MAX_LABELS = 3;

/**
 * One task on the board. The title opens the task; the "Move" menu is the keyboard (and
 * touch) alternative to dragging.
 */
@Component({
  selector: 'app-board-card',
  imports: [RouterLink, CdkMenuTrigger, CdkMenu, CdkMenuItem, StreakBadge],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCard {
  readonly card = input.required<BoardCardModel>();
  /** The board's project; null on the all-projects board, where the task's own is used. */
  readonly projectId = input.required<number | null>();
  /** Shows the card's project (a dot and its name), for the all-projects board. */
  readonly showProject = input(false);
  readonly column = input.required<BoardColumnKey>();
  readonly canMoveUp = input(false);
  readonly canMoveDown = input(false);
  /**
   * True while another move is saving. The menu's items are disabled rather than the button, so
   * keyboard focus can stay on the button of a card that was just moved.
   */
  readonly disabled = input(false);

  readonly moveTo = output<BoardColumnKey>();
  readonly moveBy = output<-1 | 1>();
  /** The menu's "Archive"; the board takes the card off and shows the Undo toast. */
  readonly archive = output<void>();

  private readonly priorities = inject(PrioritiesStore);
  private readonly projects = inject(ProjectsStore);
  private readonly session = inject(SessionService);

  protected readonly columns = BOARD_COLUMNS;
  protected readonly columnNames = BOARD_COLUMN_NAMES;

  protected readonly task = computed(() => this.card().task);
  protected readonly menuButtonId = computed(() => `board-card-${this.card().taskId}-move`);
  /** The project the card's task belongs to, which its link goes through. */
  protected readonly taskProjectId = computed(() => this.task()?.projectId ?? this.projectId());
  protected readonly project = computed(() => {
    const id = this.task()?.projectId;
    return id ? (this.projects.byId(id) ?? null) : null;
  });
  /** Priority shows as the card's tint and left accent; null when details didn't load. */
  protected readonly tone = computed(() => {
    const task = this.task();
    return task ? this.priorities.toneOf(task.priorityId) : null;
  });
  protected readonly labels = computed(() => this.task()?.labels.slice(0, MAX_LABELS) ?? []);
  protected readonly hiddenLabels = computed(() =>
    Math.max(0, (this.task()?.labels.length ?? 0) - MAX_LABELS),
  );
  protected readonly due = computed(() => {
    const dueDate = this.task()?.dueDate;
    return dueDate ? formatDate(dueDate) : null;
  });
  /** An open task due before today, in the user's timezone. */
  protected readonly overdue = computed(() => {
    const dueDate = this.task()?.dueDate;
    if (!dueDate || this.card().isDone) return false;
    const today = instantToDate(
      new Date().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    );
    return dueDate < today;
  });
}
