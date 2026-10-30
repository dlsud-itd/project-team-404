import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import {
  DEFAULT_TASK_PRIORITY,
  TASK_PRIORITIES,
  TASK_TITLE_MAX_LENGTH,
  type CreateTaskRequest,
  type Task,
  type TaskChanges,
  type TaskField,
} from '../../shared/types/task.types';
import { mapTaskError } from '../mappers/task-error.mapper';
import { TaskService } from '../services/task.service';
import { taskScheduleValidator } from '../validators/task-schedule.validator';
import { taskTitleValidator } from '../validators/task-title.validator';

export type TaskFormMode = 'create' | 'edit';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/** The form's values as the API expects them. */
type TaskValues = Required<CreateTaskRequest>;

/** "18:00:00" → "18:00", the value a time input shows. */
function toTimeInput(time: string | null): string {
  return time?.slice(0, 5) ?? '';
}

/** "18:00" → "18:00:00", the HH:mm:ss the API expects. */
function toApiTime(time: string): string | null {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
}

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskForm {
  private readonly tasks = inject(TaskService);
  private readonly tasksStore = inject(TasksStore);
  private readonly projects = inject(ProjectService);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute).snapshot;

  /** Set by the route: `.../tasks/new` creates, `.../tasks/:taskId/edit` edits. */
  protected readonly mode: TaskFormMode = this.route.data['mode'] === 'edit' ? 'edit' : 'create';
  /** The project in the URL; new tasks go here unless the user picks another. */
  protected readonly projectId = Number(this.route.paramMap.get('projectId'));
  private readonly taskId = Number(this.route.paramMap.get('taskId'));
  protected readonly listUrl = `/projects/${this.route.paramMap.get('projectId')}/tasks`;

  protected readonly titleMax = TASK_TITLE_MAX_LENGTH;
  protected readonly priorities = TASK_PRIORITIES;

  /** The task being edited, as last saved. */
  protected readonly task = computed(() =>
    this.mode === 'edit' ? (this.tasksStore.byId(this.taskId) ?? null) : null,
  );
  protected readonly loadState = signal<LoadState>(this.mode === 'edit' ? 'loading' : 'ready');

  /** Active projects, plus the URL's and the task's project if they are not among them. */
  protected readonly projectOptions = computed(() => {
    const options = this.projectsStore
      .active()
      .map((p) => ({ projectId: p.projectId, name: p.name }));
    for (const id of new Set([this.projectId, this.task()?.projectId])) {
      if (id && !options.some((o) => o.projectId === id)) {
        options.push({ projectId: id, name: this.projectsStore.byId(id)?.name ?? 'This project' });
      }
    }
    return options;
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<TaskField, string>>>({});

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      title: ['', taskTitleValidator],
      description: [''],
      priorityId: [DEFAULT_TASK_PRIORITY],
      projectId: [this.projectId],
      dueDate: [''],
      dueTime: [''],
      deadline: [''],
    },
    { validators: taskScheduleValidator },
  );

  constructor() {
    if (!this.validId(this.projectId)) {
      this.loadState.set('not-found');
      return;
    }
    if (!this.projectsStore.loaded()) {
      // Only fills the project picker; the form still works with the URL's project.
      this.projects
        .refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }
    if (this.mode === 'edit') this.load();
  }

  protected load(): void {
    if (!this.validId(this.taskId)) {
      this.loadState.set('not-found');
      return;
    }
    this.loadState.set('loading');
    this.tasks
      .get(this.taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (task) => {
          this.fill(task);
          // A repeating task's due date cannot be cleared (API spec III.J).
          if (task.isRecurring) this.form.controls.dueDate.addValidators(Validators.required);
          this.form.controls.dueDate.updateValueAndValidity();
          this.loadState.set('ready');
        },
        error: (error: unknown) =>
          this.loadState.set(mapTaskError(error).notFound ? 'not-found' : 'error'),
      });
  }

  /** In edit mode, Save stays off until something actually changed. */
  protected canSave(): boolean {
    if (this.submitting()) return false;
    if (this.mode === 'create') return true;
    const { details, schedule } = this.changes();
    return Object.keys(details).length > 0 || Object.keys(schedule).length > 0;
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set(null);
    this.saved.set(null);
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.mode === 'create') this.create();
    else this.update();
  }

  protected cancel(): void {
    if (!this.submitting()) void this.router.navigateByUrl(this.listUrl);
  }

  protected clearServerError(field: TaskField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  /** Message for a field, or null. Length and schedule errors show at once; required after leaving. */
  protected fieldError(field: TaskField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    if (field === 'dueTime' && this.form.hasError('dueTimeWithoutDate')) {
      return 'Add a due date to set a time.';
    }
    if (field === 'deadline' && this.form.hasError('deadlineBeforeDueDate')) {
      return "The deadline can't be before the due date.";
    }

    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) return null;

    if (errors['required']) {
      if (!control.touched) return null;
      return field === 'title' ? 'Task title is required.' : 'Repeating tasks need a due date.';
    }
    if (errors['maxlength']) return `Use ${TASK_TITLE_MAX_LENGTH} characters or fewer.`;
    return null;
  }

  private validId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }

  private fill(task: Task): void {
    this.form.reset({
      title: task.title,
      description: task.description ?? '',
      priorityId: task.priorityId,
      projectId: task.projectId,
      dueDate: task.dueDate ?? '',
      dueTime: toTimeInput(task.dueTime),
      deadline: task.deadline ?? '',
    });
  }

  /** Trimmed, with empty optional fields as null. */
  private values(): TaskValues {
    const { title, description, priorityId, projectId, dueDate, dueTime, deadline } =
      this.form.getRawValue();
    return {
      projectId,
      priorityId,
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate || null,
      dueTime: toApiTime(dueTime),
      deadline: deadline || null,
    };
  }

  private changes(): TaskChanges {
    const task = this.task();
    const changes: TaskChanges = { details: {}, schedule: {} };
    if (!task) return changes;

    const values = this.values();
    const { details, schedule } = changes;
    if (values.title !== task.title) details.title = values.title;
    if (values.description !== task.description) details.description = values.description;
    if (values.priorityId !== task.priorityId) details.priorityId = values.priorityId;
    if (values.projectId !== task.projectId) details.projectId = values.projectId;
    if (values.dueDate !== task.dueDate) schedule.dueDate = values.dueDate;
    if (toTimeInput(values.dueTime) !== toTimeInput(task.dueTime))
      schedule.dueTime = values.dueTime;
    if (values.deadline !== task.deadline) schedule.deadline = values.deadline;
    return changes;
  }

  private create(): void {
    const request = this.values();
    this.submitting.set(true);
    this.tasks
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (task) => void this.router.navigateByUrl(`/projects/${task.projectId}/tasks`),
        error: (error: unknown) => this.showError(error),
      });
  }

  private update(): void {
    const task = this.task();
    if (!task || !this.canSave()) return;

    this.submitting.set(true);
    this.tasks
      .save(task.taskId, this.changes())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          const updated = this.task();
          if (updated) this.fill(updated);
          this.saved.set('Changes saved.');
        },
        // The store keeps whatever part did save, so Save then offers only what is left.
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Shows a failed save next to the field it is about; the user's input is kept. */
  private showError(error: unknown): void {
    const { message, field, notFound } = mapTaskError(error);
    if (notFound) {
      this.formError.set(message);
      // The list is out of date; reload it so the missing task disappears.
      this.tasks.refresh(this.projectId).subscribe({ error: () => {} });
      return;
    }
    if (field) this.serverErrors.set({ [field]: message });
    else this.formError.set(message);
  }
}
