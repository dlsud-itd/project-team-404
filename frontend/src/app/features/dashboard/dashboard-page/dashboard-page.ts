import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CurrentUpcomingTasks } from '../current-upcoming-tasks/current-upcoming-tasks';
import { DashboardService, dashboardErrorMessage } from '../shared/services/dashboard.service';
import type { DashboardSummary } from '../shared/types/dashboard.types';

/** The summary tiles, in the order they are shown. */
export const SUMMARY_TILES: readonly { key: keyof DashboardSummary; label: string }[] = [
  { key: 'currentCount', label: 'Due today' },
  { key: 'upcomingCount', label: 'Upcoming' },
  { key: 'overdueCount', label: 'Overdue' },
  { key: 'completedCount', label: 'Completed' },
];

/** The Task Dashboard at /dashboard: task counts, then one section per kind of task. */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, CurrentUpcomingTasks],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUpcoming = viewChild(CurrentUpcomingTasks);

  protected readonly tiles = SUMMARY_TILES;
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  constructor() {
    this.loadSummary();
  }

  /** Reloads the counts and every section. */
  protected refresh(): void {
    this.loadSummary();
    this.currentUpcoming()?.reload();
  }

  protected loadSummary(): void {
    this.summaryLoading.set(true);
    this.summaryError.set(null);
    this.dashboard
      .summary()
      .pipe(
        finalize(() => this.summaryLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (summary) => this.summary.set(summary),
        // Keep the last counts on screen; the banner says they may be stale.
        error: (error: unknown) => this.summaryError.set(dashboardErrorMessage(error)),
      });
  }
}
