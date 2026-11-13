import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  convertToParamMap,
  NavigationEnd,
  Router,
  RouterLink,
  type ParamMap,
} from '@angular/router';
import { filter, finalize } from 'rxjs';
import { mapProjectError } from '../../../projects/project-crud/mappers/project-error.mapper';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { ConfirmDeleteTaskDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { TaskItem } from '../components/task-item/task-item';
import { mapTaskError } from '../mappers/task-error.mapper';
import { TaskService } from '../services/task.service';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import { LabelService, type Label } from '../../task-organization/services/label.service';

type TaskFilters = {
  /** A priority level name in lower case, or '' for every level. */
  priority: string;
  labelId: number | null;
  orderBy: '' | 'dueDate' | 'createdAt' | 'priority' | 'title';
  orderDirection: 'asc' | 'desc';
};

/** The tasks of one project, at /projects/:projectId/tasks. */
@Component({
  selector: 'app-task-list',
  imports: [RouterLink, TaskItem, ConfirmDeleteTaskDialog],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskList {
  protected readonly store = inject(TasksStore);
  private readonly tasks = inject(TaskService);
  private readonly projects = inject(ProjectService);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly labelsApi = inject(LabelService);
  protected readonly priorities = inject(PrioritiesStore);
  protected readonly labels = signal<Label[]>([]);
  protected readonly labelsError = signal<string | null>(null);
  protected readonly filters = signal<TaskFilters>(
    taskFiltersFromParams(this.route.snapshot.queryParamMap),
  );

  private readonly projectId = signal(0);
  protected readonly project = computed(() => this.projectsStore.byId(this.projectId()) ?? null);
  /** The project does not exist or belongs to someone else. */
  protected readonly projectMissing = signal(false);

  /** True until the first list request for this project settles. */
  protected readonly firstLoad = computed(() => this.store.loading() && !this.store.loaded());

  protected readonly pendingDelete = signal<Task | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    // The router reuses this page between projects, so :projectId can change under it.
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.open(Number(params.get('projectId'))));
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const params = convertToParamMap(this.router.parseUrl(this.router.url).queryParams);
        const next = taskFiltersFromParams(params);
        if (!sameFilters(next, this.filters())) {
          this.filters.set(next);
          if (this.projectId() > 0) this.load();
        }
      });
    this.labelsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => this.labels.set(labels),
        error: () => this.labelsError.set('Could not load labels. Please try again.'),
      });
  }

  private open(projectId: number): void {
    this.projectId.set(projectId);
    this.notice.set(null);
    this.actionError.set(null);
    this.projectMissing.set(!Number.isInteger(projectId) || projectId <= 0);
    if (this.projectMissing()) return;
    this.loadProject();
    this.load();
  }

  protected load(): void {
    const filters = this.filters();
    this.tasks
      .refresh(this.projectId(), {
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.labelId ? { labelId: filters.labelId } : {}),
        ...(filters.orderBy
          ? { orderBy: filters.orderBy, orderDirection: filters.orderDirection }
          : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected setPriority(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    this.updateFilters({ ...this.filters(), priority: priorityParam(target.value) });
  }

  protected setLabel(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const labelId = Number(target.value);
    this.updateFilters({
      ...this.filters(),
      labelId: Number.isInteger(labelId) && labelId > 0 ? labelId : null,
    });
  }

  protected setOrderBy(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const value = target.value;
    this.updateFilters({
      ...this.filters(),
      orderBy:
        value === 'dueDate' || value === 'createdAt' || value === 'priority' || value === 'title'
          ? value
          : '',
    });
  }

  protected setOrderDirection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    this.updateFilters({
      ...this.filters(),
      orderDirection: target.value === 'desc' ? 'desc' : 'asc',
    });
  }

  protected newTask(): void {
    this.notice.set(null);
    this.store.creating.set({ projectId: this.projectId() });
  }

  private updateFilters(filters: TaskFilters): void {
    this.filters.set(filters);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        priority: filters.priority || null,
        labelId: filters.labelId,
        orderBy: filters.orderBy || null,
        orderDirection: filters.orderBy ? filters.orderDirection : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.load();
  }

  protected askDelete(task: Task): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.deleteError.set(null);
    this.pendingDelete.set(task);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.tasks
      .delete(task.taskId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.notice.set(`“${task.title}” was deleted.`);
        },
        error: (error: unknown) => {
          const { message, notFound } = mapTaskError(error);
          if (notFound) {
            // Already gone (e.g. deleted in another tab): close and show the real list.
            this.pendingDelete.set(null);
            this.actionError.set(message);
            this.load();
            return;
          }
          this.deleteError.set(message);
        },
      });
  }

  /** Fetches the project for its name; a missing project replaces the page with a message. */
  private loadProject(): void {
    this.projects
      .get(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => {
          if (mapProjectError(error).notFound) this.projectMissing.set(true);
        },
      });
  }
}

function taskFiltersFromParams(params: ParamMap): TaskFilters {
  const priority = params.get('priority');
  const orderBy = params.get('orderBy');
  const parsedLabelId = Number(params.get('labelId'));
  return {
    priority: priorityParam(priority),
    labelId: Number.isInteger(parsedLabelId) && parsedLabelId > 0 ? parsedLabelId : null,
    orderBy:
      orderBy === 'dueDate' ||
      orderBy === 'createdAt' ||
      orderBy === 'priority' ||
      orderBy === 'title'
        ? orderBy
        : '',
    orderDirection: params.get('orderDirection') === 'desc' ? 'desc' : 'asc',
  };
}

/** A priority filter value: a level name in lower case, or '' for none. */
function priorityParam(value: string | null): string {
  const name = value?.trim().toLowerCase() ?? '';
  return name.length <= 50 ? name : '';
}

function sameFilters(left: TaskFilters, right: TaskFilters): boolean {
  return (
    left.priority === right.priority &&
    left.labelId === right.labelId &&
    left.orderBy === right.orderBy &&
    left.orderDirection === right.orderDirection
  );
}
