import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import type { Task } from '../../../shared/types/task.types';
import { formatDate } from '../../../task-scheduling/utils/date-format.util';
import { TaskStreaksService } from '../../services/task-streaks.service';
import type { StreakPeriodState } from '../../types/task-streak.types';
import {
  PERIOD_STATE_LABELS,
  currentStreakLabel,
  lastCompletedLabel,
  periodLabel,
  streakCount,
} from '../../utils/streak-label.util';
import { streakPeriods } from '../../utils/streak-periods.util';
import { StreakBadge } from '../streak-badge/streak-badge';

/** The legend under the strip, in the order the states usually appear from left to right. */
const LEGEND: readonly StreakPeriodState[] = ['done', 'missed', 'open', 'unknown'];

/**
 * A recurring task's streak in its detail view: current and longest streak, the last completion,
 * and a strip of the last 14 periods marked done, missed or open.
 */
@Component({
  selector: 'app-streak-detail',
  imports: [StreakBadge],
  templateUrl: './streak-detail.html',
  styleUrl: './streak-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakDetail {
  readonly task = input.required<Pick<Task, 'taskId' | 'projectId' | 'recurrence' | 'title'>>();

  private readonly streaks = inject(TaskStreaksService);
  protected readonly legend = LEGEND.map((state) => ({ state, label: PERIOD_STATE_LABELS[state] }));

  protected readonly streak = computed(() => this.streaks.streak(this.task().taskId));
  protected readonly loadState = computed(() => this.streaks.loadState(this.task().taskId));

  protected readonly current = computed(() => {
    const streak = this.streak();
    return streak ? currentStreakLabel(streak.currentStreak, streak.recurrence) : '';
  });
  protected readonly longest = computed(() => {
    const streak = this.streak();
    return streak ? streakCount(streak.longestStreak, streak.recurrence) : '';
  });
  protected readonly lastCompleted = computed(() =>
    lastCompletedLabel(this.streak()?.lastCompletedOn ?? null),
  );
  protected readonly nextDue = computed(() => {
    const date = this.streak()?.nextDueOn;
    return date ? formatDate(date) : null;
  });

  /** The strip, oldest period first, with a label for each cell. */
  protected readonly periods = computed(() => {
    const streak = this.streak();
    if (!streak) return [];
    return streakPeriods(streak, this.streaks.today()).map((period) => {
      const label = periodLabel(period, streak.recurrence);
      return { ...period, label, description: `${label}: ${PERIOD_STATE_LABELS[period.state]}` };
    });
  });

  constructor() {
    effect(() => this.streaks.watch(this.task()));
  }

  protected retry(): void {
    this.streaks.refresh(this.task().taskId);
  }
}
