import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { mapProjectError } from '../../../projects/project-crud/mappers/project-error.mapper';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import type { Task } from '../../shared/types/task.types';
import { ConfirmDeleteTaskDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { TaskItem } from '../components/task-item/task-item';
import { mapTaskError } from '../mappers/task-error.mapper';
import { TaskService } from '../services/task.service';

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
  private readonly destroyRef = inject(DestroyRef);

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
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.open(Number(params.get('projectId'))));
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
    this.tasks
      .refresh(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      // The store records the error for the template.
      .subscribe({ error: () => {} });
  }

  protected newTask(): void {
    this.notice.set(null);
    this.store.creating.set({ projectId: this.projectId() });
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
