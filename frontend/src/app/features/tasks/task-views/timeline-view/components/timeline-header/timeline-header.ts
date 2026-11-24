import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TimelineWindow, TimelineZoom } from '../../types/task-timeline.types';
import { windowLabel } from '../../utils/timeline-scale.util';

export type TimelineStep = 'prev' | 'today' | 'next';

/** The timeline's controls: move between windows, pick Week or Month, show completed tasks. */
@Component({
  selector: 'app-timeline-header',
  templateUrl: './timeline-header.html',
  styleUrl: './timeline-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineHeader {
  readonly zoom = input.required<TimelineZoom>();
  readonly window = input.required<TimelineWindow>();
  readonly includeCompleted = input(false);
  /** Whether today is on screen; Today then has nothing to do. */
  readonly showsToday = input(false);

  readonly navigate = output<TimelineStep>();
  readonly zoomChange = output<TimelineZoom>();
  readonly includeCompletedChange = output<boolean>();

  protected readonly zooms: { value: TimelineZoom; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  protected readonly label = computed(() => windowLabel(this.zoom(), this.window()));
  protected readonly unit = computed(() => (this.zoom() === 'week' ? 'week' : 'month'));

  protected pickZoom(zoom: TimelineZoom): void {
    if (zoom !== this.zoom()) this.zoomChange.emit(zoom);
  }

  protected toggleCompleted(event: Event): void {
    this.includeCompletedChange.emit((event.target as HTMLInputElement).checked);
  }
}
