import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  type OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewAllLink } from '../../../shared/components/view-all-link/view-all-link';
import { SessionService } from '../../auth/session/session.service';
import { SettingsStore } from '../../settings/state/settings.store';
import type { Task } from '../../tasks/shared/types/task.types';
import { instantToDate, userTimeZone } from '../../tasks/task-scheduling/utils/date-format.util';
import {
  DASHBOARD_NOW,
  DashboardService,
  mapDashboardError,
} from '../shared/services/dashboard.service';
import { DEFAULT_UPCOMING_DAYS } from '../shared/types/dashboard.types';
import { TaskGroup } from './components/task-group/task-group';
import { groupByDay, limitGroups } from './utils/group-by-day.util';

type LoadState = 'loading' | 'ready' | 'error';

/** Open tasks due today, tomorrow and later this week, on the dashboard. */
@Component({
  selector: 'app-current-upcoming-tasks',
  imports: [TaskGroup, ViewAllLink],
  templateUrl: './current-upcoming-tasks.html',
  styleUrl: './current-upcoming-tasks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentUpcomingTasks implements OnInit {
  /** How many days after today to include. */
  readonly days = input(DEFAULT_UPCOMING_DAYS);

  private readonly dashboard = inject(DashboardService);
  private readonly session = inject(SessionService);
  private readonly settings = inject(SettingsStore);
  private readonly now = inject(DASHBOARD_NOW);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly error = signal<string | null>(null);
  private readonly tasks = signal<Task[]>([]);
  /** Every matching task according to the server, including ones it left out. */
  private readonly serverTotal = signal(0);
  /** When the tasks were last requested; reset on every load so "today" never goes stale. */
  private readonly loadedAt = signal(new Date(0));

  /** Today in the user's timezone, the same "today" the server used. */
  private readonly today = computed(() =>
    instantToDate(
      this.loadedAt().toISOString(),
      userTimeZone(this.session.currentUser()?.timezone),
    ),
  );
  private readonly allGroups = computed(() => groupByDay(this.tasks(), this.today()));
  /** The groups capped at the user's "tasks per dashboard widget" setting. */
  protected readonly groups = computed(() =>
    limitGroups(this.allGroups(), this.settings.taskLimit()),
  );
  protected readonly shown = computed(() => countTasks(this.groups()));
  /** All tasks in the window: the server's total, less any it sent that fall outside the groups. */
  protected readonly total = computed(() => {
    const grouped = countTasks(this.allGroups());
    return Math.max(grouped, this.serverTotal() - (this.tasks().length - grouped));
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loadState.set('loading');
    this.error.set(null);
    this.loadedAt.set(this.now());
    this.dashboard
      .currentUpcoming(this.days())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tasks, total }) => {
          this.tasks.set(tasks);
          this.serverTotal.set(total);
          this.loadState.set('ready');
        },
        error: (error: unknown) => {
          this.error.set(mapDashboardError(error).message);
          this.loadState.set('error');
        },
      });
  }
}

function countTasks(groups: readonly { tasks: readonly unknown[] }[]): number {
  return groups.reduce((sum, group) => sum + group.tasks.length, 0);
}
