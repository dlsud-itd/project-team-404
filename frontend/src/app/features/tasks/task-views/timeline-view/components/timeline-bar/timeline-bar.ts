import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ApiTimelineBar, TimelineWindow } from '../../types/task-timeline.types';
import { barGeometry, spanLabel } from '../../utils/timeline-scale.util';

/**
 * One task on the timeline, from the start of its first day to the end of its last.
 *
 * - The round checkbox marks the task done or not done.
 * - Clicking anywhere else on the bar opens the task.
 * - Right-click (or the Menu key / Shift+F10 on its title) opens Edit and Archive.
 */
@Component({
  selector: 'app-timeline-bar',
  imports: [CdkContextMenuTrigger, CdkMenu, CdkMenuItem],
  templateUrl: './timeline-bar.html',
  styleUrl: './timeline-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.left.%]': 'geometry()?.left',
    '[style.width.%]': 'geometry()?.width',
    '[style.display]': 'geometry() ? null : "none"',
  },
})
export class TimelineBar {
  readonly bar = input.required<ApiTimelineBar>();
  readonly window = input.required<TimelineWindow>();
  /** A change to the task is saving; the checkbox waits for it. */
  readonly busy = input(false);

  /** Open the task to edit it. */
  readonly open = output<void>();
  readonly toggleDone = output<void>();
  readonly archive = output<void>();

  protected readonly geometry = computed(() => barGeometry(this.bar(), this.window()));
  protected readonly dates = computed(() => spanLabel(this.bar().start, this.bar().end));
  protected readonly state = computed(() => {
    const bar = this.bar();
    if (bar.isDone) return 'Completed';
    if (bar.isOverdue) return 'Overdue';
    return null;
  });
  /** "Draft recap, Nov 3 – Nov 7, 2026, Overdue" */
  protected readonly label = computed(() =>
    [this.bar().title, this.dates(), this.state()].filter(Boolean).join(', '),
  );
  /** The hover tooltip: the same facts, one per line. */
  protected readonly tooltip = computed(() =>
    [this.bar().title, this.dates(), this.state()].filter(Boolean).join('\n'),
  );
  protected readonly checkLabel = computed(
    () => `Mark ${this.bar().title} ${this.bar().isDone ? 'not done' : 'done'}`,
  );

  protected check(event: MouseEvent): void {
    // The checkbox sits on the bar; its click must not also open the task.
    event.stopPropagation();
    if (!this.busy()) this.toggleDone.emit();
  }
}
