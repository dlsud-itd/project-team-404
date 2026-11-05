import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { DashboardService, dashboardErrorMessage } from '../shared/services/dashboard.service';
import type { DashboardTask } from '../shared/types/dashboard.types';
import { TaskGroup } from './components/task-group/task-group';
import { groupByDay } from './utils/group-by-day.util';

/**
 * The dashboard's Current & upcoming section: open tasks due today or later, split into Today,
 * Tomorrow and Later. It loads its own tasks; the host page can call reload().
 */
@Component({
  selector: 'app-current-upcoming-tasks',
  imports: [TaskGroup],
  templateUrl: './current-upcoming-tasks.html',
  styleUrl: './current-upcoming-tasks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentUpcomingTasks {
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  /** The user's day; the default is read when the tasks arrive, so it stays fresh. */
  readonly today = input<Date | null>(null);

  private readonly tasks = signal<DashboardTask[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  /** When the last list arrived, so Today is worked out against that moment. */
  private readonly loadedAt = signal(new Date());

  protected readonly groups = computed(() =>
    groupByDay(this.tasks(), this.today() ?? this.loadedAt()),
  );
  protected readonly total = computed(() => this.tasks().length);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboard
      .tasksByStatus(['current', 'upcoming'])
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tasks) => {
          this.loadedAt.set(new Date());
          this.tasks.set(tasks);
          this.loaded.set(true);
        },
        error: (error: unknown) => this.error.set(dashboardErrorMessage(error)),
      });
  }
}
