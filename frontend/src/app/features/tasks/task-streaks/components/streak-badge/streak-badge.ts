import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { Task } from '../../../shared/types/task.types';
import { TaskStreaksService } from '../../services/task-streaks.service';
import type { TaskStreak } from '../../types/task-streak.types';
import { currentStreakLabel, lastCompletedLabel, streakCount } from '../../utils/streak-label.util';

let nextId = 0;

/** Above the badge, or below it when there is no room above. */
const TOOLTIP_POSITIONS: ConnectedPosition[] = [
  { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -6 },
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 6 },
];

/**
 * A flame with a recurring task's current streak. Hovering or focusing it shows the longest
 * streak and the last completion. It turns red when today's occurrence is still open and the
 * streak would end without it. Shows nothing until the streak has loaded.
 *
 * Give it a task to load that task's streak, or a streak that is already known (as the
 * dashboard does) to skip the request.
 */
@Component({
  selector: 'app-streak-badge',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './streak-badge.html',
  styleUrl: './streak-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakBadge {
  readonly task = input<Pick<Task, 'taskId' | 'projectId' | 'recurrence' | 'title'> | null>(null);
  /** A streak already in hand; when set, nothing is requested. */
  readonly known = input<TaskStreak | null>(null, { alias: 'streak' });

  private readonly streaks = inject(TaskStreaksService);
  protected readonly tooltipId = `streak-tooltip-${++nextId}`;
  protected readonly tooltipOpen = signal(false);
  protected readonly positions = TOOLTIP_POSITIONS;

  protected readonly streak = computed(() => {
    const known = this.known();
    if (known) return known;
    const task = this.task();
    return task ? this.streaks.streak(task.taskId) : null;
  });

  /** The text shown next to the flame: "4 days", or "No streak yet" at 0. */
  protected readonly countLabel = computed(() => {
    const streak = this.streak();
    return streak ? currentStreakLabel(streak.currentStreak, streak.recurrence) : '';
  });

  /** The accessible name; it starts with the visible text's words so voice control finds it. */
  protected readonly label = computed(() => {
    const streak = this.streak();
    if (!streak) return '';
    if (streak.currentStreak === 0) return 'No streak yet';
    const count = this.countLabel();
    return streak.atRisk ? `Streak: ${count}, at risk` : `Streak: ${count}`;
  });

  /** The tooltip's lines. */
  protected readonly details = computed(() => {
    const streak = this.streak();
    if (!streak) return [];
    const lines = [
      `Longest streak: ${streakCount(streak.longestStreak, streak.recurrence)}`,
      `Last completed: ${lastCompletedLabel(streak.lastCompletedOn)}`,
    ];
    if (streak.atRisk) lines.push('Due today. Complete it to keep the streak');
    return lines;
  });

  constructor() {
    effect(() => {
      const task = this.task();
      if (task && !this.known()) this.streaks.watch(task);
    });
  }
}
