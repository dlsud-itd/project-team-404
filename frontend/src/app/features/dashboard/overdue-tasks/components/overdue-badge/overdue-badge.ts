import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { overdueDuration } from '../../utils/overdue-duration.util';

/** "3 days overdue" under an overdue task's date. */
@Component({
  selector: 'app-overdue-badge',
  templateUrl: './overdue-badge.html',
  styleUrl: './overdue-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueBadge {
  /** The task's deadline, an ISO instant. */
  readonly deadline = input.required<string>();
  /** The time to measure lateness from. */
  readonly now = input.required<Date>();
  /** The user's timezone, which decides where each day starts. */
  readonly timeZone = input.required<string>();

  protected readonly duration = computed(() =>
    overdueDuration(this.deadline(), this.now(), this.timeZone()),
  );
}
