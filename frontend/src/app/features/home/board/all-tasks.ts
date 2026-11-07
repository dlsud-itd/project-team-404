import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, type ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ConfirmDeleteTaskDialog } from '../../tasks/task-crud/components/confirm-delete-dialog/confirm-delete-dialog';
import { NewTaskDialog } from '../../tasks/task-crud/components/new-task-dialog/new-task-dialog';
import { DashboardStore, PRIORITIES, type Priority, type Task } from '../dashboard.store';
import { mapTaskError } from '../../tasks/task-crud/mappers/task-error.mapper';
import { TaskService } from '../../tasks/task-crud/services/task.service';

/** Like Validators.required, but a title of only spaces counts as empty too. */
const notBlank: ValidatorFn = ({ value }) =>
  typeof value === 'string' && !value.trim() ? { required: true } : null;

@Component({
  selector: 'app-all-tasks',
  imports: [ReactiveFormsModule, ConfirmDeleteTaskDialog, NewTaskDialog],
  templateUrl: './all-tasks.html',
  styleUrl: './all-tasks.scss',
  host: {
    '(document:click)': 'closeTaskMenu()',
    '(document:keydown.escape)': 'closeTaskMenu()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllTasks {
  protected readonly store = inject(DashboardStore);
  protected readonly priorities = PRIORITIES;
  protected readonly actionError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly busyTasks = signal<ReadonlySet<number>>(new Set());
  protected readonly openTaskMenuId = signal<number | null>(null);
  protected readonly pendingDelete = signal<Task | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly editingTaskId = signal<number | null>(null);
  private readonly tasksApi = inject(TaskService);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the new-task form is open; the page's "+ New Task" button also sets it. */
  readonly composing = model(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [notBlank, Validators.maxLength(200)]],
    projectId: [''],
    priority: ['medium' as Priority],
    due: [this.store.today(), Validators.required],
  });

  /** The day picked on the calendar, if any. */
  private readonly dueFilter = computed(() => this.store.filter().due);

  protected readonly heading = computed(() => {
    const due = this.dueFilter();
    return due ? `Due ${this.shortDate(due)}` : 'All Tasks';
  });

  constructor() {
    // Opening the form, or picking a day while it is open, starts the due date on that day.
    effect(() => {
      const due = this.dueFilter();
      if (!this.composing()) return;
      untracked(() => this.form.controls.due.setValue(due ?? this.store.today()));
    });
  }

  protected create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, projectId, priority, due } = this.form.getRawValue();
    this.actionError.set(null);
    this.submitting.set(true);
    this.tasksApi
      .create({
        ...(projectId ? { projectId: Number(projectId) } : {}),
        priorityId: priority === 'high' ? 1 : priority === 'medium' ? 2 : 3,
        title: title.trim(),
        description: null,
        dueDate: due || null,
        deadline: null,
        recurrence: 'none',
        recurrenceDays: [],
        recurrenceEndDate: null,
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (task) => {
          this.store.upsertTask(task);
          this.form.reset({ title: '', projectId, priority: 'medium', due: this.store.today() });
          this.composing.set(false);
        },
        error: (error: unknown) => this.actionError.set(mapTaskError(error).message),
      });
  }

  protected isBusy(task: Task): boolean {
    return this.busyTasks().has(task.id);
  }

  protected toggleTask(task: Task): void {
    if (this.isBusy(task)) return;
    const completedAt = task.done ? null : new Date().toISOString();
    this.setBusy(task.id, true);
    this.actionError.set(null);
    this.tasksApi
      .update(task.id, { completedAt })
      .pipe(
        finalize(() => this.setBusy(task.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.store.setTaskCompletion(task.id, completedAt),
        error: (error: unknown) => this.actionError.set(mapTaskError(error).message),
      });
  }

  protected toggleTaskMenu(taskId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openTaskMenuId.update((current) => (current === taskId ? null : taskId));
  }

  protected showContextMenu(event: MouseEvent, taskId: number): void {
    event.preventDefault();
    this.openTaskMenuId.set(taskId);
  }

  protected closeTaskMenu(): void {
    this.openTaskMenuId.set(null);
  }

  protected editTask(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.closeTaskMenu();
    this.actionError.set(null);
    this.editingTaskId.set(task.id);
  }

  protected askDelete(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.closeTaskMenu();
    this.deleteError.set(null);
    this.pendingDelete.set(task);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.isBusy(task)) return;
    this.setBusy(task.id, true);
    this.deleteError.set(null);
    this.tasksApi
      .delete(task.id)
      .pipe(
        finalize(() => this.setBusy(task.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.store.removeTask(task.id);
          this.pendingDelete.set(null);
        },
        error: (error: unknown) => this.deleteError.set(mapTaskError(error).message),
      });
  }

  protected shortDate(key: string | null): string {
    if (!key) return 'No due date';
    return new Date(`${key}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private setBusy(taskId: number, busy: boolean): void {
    this.busyTasks.update((tasks) => {
      const next = new Set(tasks);
      if (busy) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }
}
