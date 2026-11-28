import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, of, switchMap, tap } from 'rxjs';
import { ProjectService } from '../../../projects/project-crud/services/project.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { TasksStore } from '../../shared/state/tasks.store';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import {
  TASK_TITLE_MAX_LENGTH,
  type CreateTaskRequest,
  type Task,
  type TaskChanges,
  type TaskField,
} from '../../shared/types/task.types';
import { DatePicker } from '../../task-scheduling/components/date-picker/date-picker';
import { RecurrencePicker } from '../../task-scheduling/components/recurrence-picker/recurrence-picker';
import {
  DEFAULT_TASK_RECURRENCE,
  type RecurrenceEnds,
  type Weekday,
} from '../../task-scheduling/types/task-scheduling.types';
import { endAfterStartValidator } from '../../task-scheduling/validators/end-after-start.validator';
import { recurrenceRequiresDueDateValidator } from '../../task-scheduling/validators/recurrence-requires-due-date.validator';
import { recurrenceRuleValidator } from '../../task-scheduling/validators/recurrence-rule.validator';
import { StreakDetail } from '../../task-streaks/components/streak-detail/streak-detail';
import { mapTaskError } from '../mappers/task-error.mapper';
import { TaskService } from '../services/task.service';
import { taskTitleValidator } from '../validators/task-title.validator';
import { LabelService, type Label } from '../../task-organization/services/label.service';
import { ArchiveAction } from '../../../archive/components/archive-action/archive-action';
import {
  type ArchiveHooks,
  ArchiveUndoService,
} from '../../../archive/services/archive-undo.service';

export type TaskFormMode = 'create' | 'edit';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-task-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePicker,
    RecurrencePicker,
    StreakDetail,
    ArchiveAction,
  ],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  host: {
    '[class.in-dialog]': 'dialog',
    '(document:keydown.escape)': 'dialog && cancel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskForm implements OnInit {
  /** The popup was cancelled. */
  readonly closed = output<void>();
  /** The popup saved a new task. */
  readonly created = output<Task>();
  /** The edit form saved a task. */
  readonly updated = output<Task>();
  /** The task to edit when this form is used in a modal. */
  readonly editTaskId = input<number | null>(null);

  private readonly tasks = inject(TaskService);
  private readonly tasksStore = inject(TasksStore);
  private readonly labelsApi = inject(LabelService);
  private readonly projects = inject(ProjectService);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly prioritiesStore = inject(PrioritiesStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly archiveUndo = inject(ArchiveUndoService);

  /** What the new-task popup asked for; null on the edit page. */
  private readonly popup = this.tasksStore.creating();
  protected dialog = false;

  /** The route or modal can select edit mode. */
  protected mode: TaskFormMode = 'create';
  /** New tasks go here unless the user picks another; 0 until the Inbox is known. */
  protected projectId = 0;
  private taskId = 0;
  protected listUrl = '/projects';

  protected readonly titleMax = TASK_TITLE_MAX_LENGTH;
  /** The user's levels in their order, plus the edited task's level if it is no longer among them. */
  protected readonly priorities = computed(() => {
    const options = this.prioritiesStore
      .levels()
      .map((level) => ({ priorityId: level.id, label: level.name }));
    const current = this.task()?.priorityId;
    if (current !== undefined && !options.some((option) => option.priorityId === current)) {
      options.push({ priorityId: current, label: this.prioritiesStore.nameOf(current) });
    }
    return options;
  });

  /** The task being edited, as last saved. */
  protected readonly task = computed(() =>
    this.mode === 'edit' ? (this.tasksStore.byId(this.taskId) ?? null) : null,
  );
  protected readonly loadState = signal<LoadState>('ready');
  /** Archived tasks are read-only until they are restored. */
  protected readonly archived = computed(() => this.task()?.isArchived ?? false);
  /** Archived labels already on the task: shown greyed, and they can't be picked again. */
  protected readonly archivedLabels = computed(() => {
    const active = new Set(this.labels().map((label) => label.labelId));
    return (this.task()?.labels ?? []).filter(
      (label) => label.isArchived && !active.has(label.labelId),
    );
  });
  protected readonly restoring = signal(false);

  /** Archiving from the form closes it; the Undo toast brings the task back. */
  protected readonly archiveHooks = (taskId: number): ArchiveHooks => ({
    apply: () => {
      this.tasksStore.patch(taskId, { isArchived: true });
      this.leave();
    },
    rollback: () => this.tasksStore.patch(taskId, { isArchived: false }),
  });

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
  protected readonly labels = signal<Label[]>([]);
  protected readonly labelsError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      title: ['', taskTitleValidator],
      description: [''],
      priorityId: [this.prioritiesStore.defaultLevel().id],
      projectId: [this.projectId],
      labelIds: [[] as number[]],
      scheduledDate: [''],
      dueDate: [''],
      recurrence: [DEFAULT_TASK_RECURRENCE],
      /** Weekly repeats only. */
      recurrenceDays: [[] as Weekday[]],
      recurrenceEnds: ['never' as RecurrenceEnds],
      /** YYYY-MM-DD; only used when recurrenceEnds is 'date'. */
      recurrenceEndDate: [''],
    },
    {
      validators: [
        endAfterStartValidator,
        recurrenceRequiresDueDateValidator,
        recurrenceRuleValidator,
      ],
    },
  );

  constructor() {
    // An archived task can be read but not edited.
    effect(() => {
      if (this.archived()) this.form.disable({ emitEvent: false });
      else if (this.form.disabled) this.form.enable({ emitEvent: false });
    });
    // A task opened without a project goes to the default project from Settings; that falls back
    // to the Inbox when none is chosen, or the chosen one is archived or gone.
    effect(() => {
      const fallback = this.projectsStore.defaultProject();
      const project = this.form.controls.projectId;
      if (fallback && !project.value) project.setValue(fallback.projectId);
    });
    // The user's levels may load after the form opens; new tasks follow their default until picked.
    effect(() => {
      const fallback = this.prioritiesStore.defaultLevel().id;
      const priority = this.form.controls.priorityId;
      if (this.mode === 'create' && priority.pristine) priority.setValue(fallback);
    });
  }

  ngOnInit(): void {
    const modalTaskId = this.editTaskId();
    this.dialog = this.popup !== null || modalTaskId !== null;
    this.mode = modalTaskId !== null || this.route.data['mode'] === 'edit' ? 'edit' : 'create';
    this.projectId = this.popup
      ? (this.popup.projectId ?? 0)
      : Number(this.route.paramMap.get('projectId')) || 0;
    this.taskId = modalTaskId ?? Number(this.route.paramMap.get('taskId'));
    this.listUrl = `/projects/${this.route.paramMap.get('projectId')}/tasks`;
    this.form.controls.projectId.setValue(this.projectId);
    if (this.popup?.dueDate) this.form.controls.dueDate.setValue(this.popup.dueDate);
    if (this.popup?.scheduledDate) {
      this.form.controls.scheduledDate.setValue(this.popup.scheduledDate);
    }
    this.loadState.set(this.mode === 'edit' ? 'loading' : 'ready');

    if (!this.dialog && !this.validId(this.projectId)) {
      this.loadState.set('not-found');
      return;
    }
    if (!this.projectsStore.loaded()) {
      // Only fills the project picker; the form still works without it.
      this.projects
        .refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} });
    }
    this.loadLabels();
    if (this.mode === 'edit') this.load();
  }

  private loadLabels(): void {
    this.labelsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => this.labels.set(labels),
        error: () => this.labelsError.set('Could not load labels. Please try again.'),
      });
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
          this.loadState.set('ready');
        },
        error: (error: unknown) =>
          this.loadState.set(mapTaskError(error).notFound ? 'not-found' : 'error'),
      });
  }

  /** Restores the archived task in place so it can be edited again. */
  protected restore(): void {
    const task = this.task();
    if (!task || this.restoring()) return;
    this.restoring.set(true);
    this.archiveUndo.restore(
      { kind: 'task', id: task.taskId, name: task.title },
      {
        announce: true,
        apply: () => this.tasksStore.patch(task.taskId, { isArchived: false }),
        rollback: () => this.tasksStore.patch(task.taskId, { isArchived: true }),
        done: () => this.restoring.set(false),
        failed: () => this.restoring.set(false),
      },
    );
  }

  /** In edit mode, Save stays off until something actually changed. */
  protected canSave(): boolean {
    if (this.submitting() || this.archived()) return false;
    if (this.mode === 'create') return true;
    const { details, schedule } = this.changes();
    return (
      Object.keys(details).length > 0 || Object.keys(schedule).length > 0 || this.labelsChanged()
    );
  }

  protected submit(): void {
    if (this.submitting() || this.archived()) return;
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
    if (this.submitting()) return;
    this.leave();
  }

  private leave(): void {
    if (this.dialog) this.closed.emit();
    else void this.router.navigateByUrl(this.listUrl);
  }

  protected clearServerError(field: TaskField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  protected toggleLabel(labelId: number, event: Event): void {
    if (this.archived()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const selected = new Set(this.form.controls.labelIds.value);
    if (target.checked) selected.add(labelId);
    else selected.delete(labelId);
    this.form.controls.labelIds.setValue([...selected]);
  }

  /** Message for a field, or null. Length and schedule errors show at once; required after leaving. */
  protected fieldError(field: TaskField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    if (field === 'dueDate' && this.form.hasError('recurrenceWithoutDueDate')) {
      return 'Repeating tasks need an end date.';
    }
    if (field === 'dueDate' && this.form.hasError('endBeforeStart')) {
      return "The end date can't be before the start date.";
    }
    if (field === 'recurrenceDays') {
      return this.form.hasError('recurrenceDaysRequired') ? 'Pick at least one day.' : null;
    }
    if (field === 'recurrenceEndDate') {
      if (this.form.hasError('recurrenceEndBeforeDueDate')) {
        return "Repeating can't stop before the task's end date.";
      }
      // Only once the user has tried to save, so picking "Date" doesn't flash an error.
      const endDate = this.form.controls.recurrenceEndDate;
      return this.form.hasError('recurrenceEndDateRequired') && endDate.touched
        ? 'Pick the date the task stops repeating.'
        : null;
    }

    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) return null;

    if (errors['required']) {
      return control.touched ? 'Task title is required.' : null;
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
      labelIds: task.labels.map((label) => label.labelId),
      scheduledDate: task.scheduledDate ?? '',
      dueDate: task.dueDate ?? '',
      recurrence: task.recurrence,
      recurrenceDays: task.recurrenceDays,
      recurrenceEnds: task.recurrenceEndDate ? 'date' : 'never',
      recurrenceEndDate: task.recurrenceEndDate ?? '',
    });
  }

  /** As the API expects them: trimmed, with empty optional fields as null. */
  private values(): CreateTaskRequest {
    const {
      title,
      description,
      priorityId,
      projectId,
      scheduledDate,
      dueDate,
      recurrence,
      recurrenceDays,
      recurrenceEnds,
      recurrenceEndDate,
    } = this.form.getRawValue();
    return {
      // Left out if the Inbox never loaded; the server then uses the Inbox itself.
      projectId: projectId || undefined,
      priorityId,
      title: title.trim(),
      description: description.trim() || null,
      scheduledDate: scheduledDate || null,
      dueDate: dueDate || null,
      recurrence,
      // Hidden parts of the rule are dropped, e.g. the days after switching from weekly to daily.
      recurrenceDays: recurrence === 'weekly' ? recurrenceDays : [],
      recurrenceEndDate:
        recurrence !== 'none' && recurrenceEnds === 'date' ? recurrenceEndDate || null : null,
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
    if (values.scheduledDate !== task.scheduledDate) schedule.scheduledDate = values.scheduledDate;
    if (values.dueDate !== task.dueDate) schedule.dueDate = values.dueDate;
    // The rule is saved as a whole, so any part changing sends all of it.
    if (
      values.recurrence !== task.recurrence ||
      values.recurrenceDays.join() !== task.recurrenceDays.join() ||
      values.recurrenceEndDate !== task.recurrenceEndDate
    ) {
      schedule.recurrence = values.recurrence;
      schedule.recurrenceDays = values.recurrenceDays;
      schedule.recurrenceEndDate = values.recurrenceEndDate;
    }
    return changes;
  }

  private labelsChanged(): boolean {
    const current = this.task()?.labels.map((label) => label.labelId) ?? [];
    const selected = this.form.controls.labelIds.value;
    return (
      [...current].sort((a, b) => a - b).join(',') !== [...selected].sort((a, b) => a - b).join(',')
    );
  }

  private create(): void {
    const request = this.values();
    const labelIds = this.form.controls.labelIds.value;
    this.submitting.set(true);
    this.tasks
      .create(request)
      .pipe(
        switchMap((task) =>
          labelIds.length
            ? this.labelsApi
                .syncTaskLabels(task.taskId, [], labelIds)
                .pipe(map((labels) => ({ ...task, labels })))
            : of(task),
        ),
        tap((task) => this.tasksStore.patch(task.taskId, { labels: task.labels })),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (task) => this.created.emit(task),
        error: (error: unknown) => this.showError(error),
      });
  }

  private update(): void {
    const task = this.task();
    if (!task || !this.canSave()) return;
    const labelIds = this.form.controls.labelIds.value;
    const syncLabels = this.labelsChanged()
      ? this.labelsApi.syncTaskLabels(
          task.taskId,
          task.labels.map((label) => label.labelId),
          labelIds,
        )
      : of(task.labels);

    this.submitting.set(true);
    this.tasks
      .save(task.taskId, this.changes())
      .pipe(
        switchMap(() =>
          syncLabels.pipe(tap((labels) => this.tasksStore.patch(task.taskId, { labels }))),
        ),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          const updated = this.task();
          if (updated) {
            this.fill(updated);
            this.updated.emit(updated);
          }
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
