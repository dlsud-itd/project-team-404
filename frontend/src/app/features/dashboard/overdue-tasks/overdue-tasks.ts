import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  type OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../auth/session/session.service';
import { ProjectService } from '../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import type { Task } from '../../tasks/shared/types/task.types';
import {
  formatDate,
  instantToDate,
  userTimeZone,
} from '../../tasks/task-scheduling/utils/date-format.util';
import {
  DASHBOARD_NOW,
  DashboardService,
  mapDashboardError,
} from '../shared/services/dashboard.service';
import { OverdueBadge } from './components/overdue-badge/overdue-badge';

type LoadState = 'loading' | 'ready' | 'error';

/** Dot color for tasks whose project has no color or isn't known. */
const FALLBACK_DOT_COLOR = '#bbb';

/** Open tasks whose deadline has passed, oldest first, on the dashboard. */
@Component({
  selector: 'app-overdue-tasks',
  imports: [RouterLink, OverdueBadge],
  templateUrl: './overdue-tasks.html',
  styleUrl: './overdue-tasks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueTasks implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly session = inject(SessionService);
  private readonly projects = inject(ProjectsStore);
  private readonly projectService = inject(ProjectService);
  private readonly now = inject(DASHBOARD_NOW);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly error = signal<string | null>(null);
  /** In the server's order: oldest deadline first. */
  protected readonly tasks = signal<Task[]>([]);
  /** When the tasks were last requested; lateness is measured from here. */
  protected readonly loadedAt = signal(new Date(0));

  protected readonly timeZone = computed(() => userTimeZone(this.session.currentUser()?.timezone));
  protected readonly countLabel = computed(() => {
    const count = this.tasks().length;
    return `${count} overdue ${count === 1 ? 'task' : 'tasks'}`;
  });

  ngOnInit(): void {
    this.load();
    this.loadProjectColors();
  }

  protected load(): void {
    this.loadState.set('loading');
    this.error.set(null);
    this.loadedAt.set(this.now());
    this.dashboard
      .overdue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.loadState.set('ready');
        },
        error: (error: unknown) => {
          this.error.set(mapDashboardError(error).message);
          this.loadState.set('error');
        },
      });
  }

  protected dotColor(task: Task): string {
    return this.projects.byId(task.projectId)?.color ?? FALLBACK_DOT_COLOR;
  }

  protected deadlineLabel(task: Task): string {
    if (!task.deadline) return '';
    return formatDate(instantToDate(task.deadline, this.timeZone()), this.loadedAt());
  }

  /** Tasks whose project was deleted have no page to edit them on. */
  protected editLink(task: Task): (string | number)[] | null {
    return task.projectId > 0 ? ['/projects', task.projectId, 'tasks', task.taskId, 'edit'] : null;
  }

  /** Project colors are a nice-to-have: if they can't load, dots stay grey. */
  private loadProjectColors(): void {
    if (this.projects.loaded() || this.projects.loading()) return;
    this.projectService
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
