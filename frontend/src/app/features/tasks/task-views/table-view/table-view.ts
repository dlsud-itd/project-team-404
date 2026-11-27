import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService } from '../../../auth/session/session.service';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { PrioritiesStore } from '../../../settings/state/priorities.store';
import type { Task } from '../../shared/types/task.types';
import { availableOnLabel, occurrenceAvailableOn } from '../../shared/utils/occurrence-due.util';
import { mapTaskError } from '../../task-crud/mappers/task-error.mapper';
import { TaskService } from '../../task-crud/services/task.service';
import {
  formatDate,
  instantToDate,
  userTimeZone,
} from '../../task-scheduling/utils/date-format.util';
import { recurrenceSummary } from '../../task-scheduling/utils/recurrence-label.util';
import { StreakBadge } from '../../task-streaks/components/streak-badge/streak-badge';
import type { TableColumn, TableSort } from '../types/task-view.types';
import {
  TABLE_COLUMNS,
  columnAriaSort,
  nextTableSort,
  sortButtonLabel,
} from '../utils/table-columns.util';

/** One row's cells, worked out once per task rather than on every check. */
interface TableRow {
  task: Task;
  done: boolean;
  project: string;
  priority: string;
  priorityColor: string | null;
  scheduled: string | null;
  due: string | null;
  deadline: string | null;
  recurrence: string | null;
  status: 'Done' | 'Overdue' | 'To do';
  /** "Available on Nov 22" while a repeat can't be completed yet. */
  notDue: string | null;
}

/** Clicks on these inside a row do their own thing instead of opening the task. */
const INTERACTIVE = 'a, button, input, label, select, textarea, [tabindex]';

/**
 * The table view: one row per task, in the order the page loaded them. Sortable headers ask the
 * page for a new orderBy and orderDirection, so the server does the sorting and the URL keeps
 * it. Clicking a row (or its title, from the keyboard) opens the task.
 */
@Component({
  selector: 'app-table-view',
  imports: [RouterLink, StreakBadge],
  templateUrl: './table-view.html',
  styleUrl: './table-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableView {
  readonly tasks = input.required<readonly Task[]>();
  readonly sort = input.required<TableSort>();
  readonly sortChange = output<TableSort>();

  private readonly tasksApi = inject(TaskService);
  private readonly priorities = inject(PrioritiesStore);
  private readonly projects = inject(ProjectsStore);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = TABLE_COLUMNS;
  protected readonly busy = signal<ReadonlySet<number>>(new Set());
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed<TableRow[]>(() => {
    const timeZone = userTimeZone(this.session.currentUser()?.timezone);
    const today = instantToDate(new Date().toISOString(), timeZone);
    return this.tasks().map((task) => {
      const done = task.completedAt !== null;
      const availableOn = occurrenceAvailableOn(
        { isRecurring: task.isRecurring, done, occurrence: task.dueDate ?? task.scheduledDate },
        today,
      );
      return {
        task,
        done,
        project: this.projects.byId(task.projectId)?.name ?? 'Inbox',
        priority: this.priorities.nameOf(task.priorityId),
        priorityColor: this.priorities.toneOf(task.priorityId).accent,
        scheduled: task.scheduledDate ? formatDate(task.scheduledDate) : null,
        due: task.dueDate ? formatDate(task.dueDate) : null,
        deadline: task.deadline ? formatDate(instantToDate(task.deadline, timeZone)) : null,
        recurrence: recurrenceSummary(task.recurrence, task.recurrenceDays, task.recurrenceEndDate),
        status: done ? 'Done' : task.dueDate && task.dueDate < today ? 'Overdue' : 'To do',
        notDue: availableOn ? availableOnLabel(availableOn) : null,
      };
    });
  });

  protected ariaSort(column: TableColumn) {
    return columnAriaSort(column, this.sort());
  }

  protected sortLabel(column: TableColumn): string {
    return sortButtonLabel(column, this.sort());
  }

  protected sortBy(column: TableColumn): void {
    if (column.sortField) this.sortChange.emit(nextTableSort(this.sort(), column.sortField));
  }

  protected editLink(task: Task): (string | number)[] {
    return ['/projects', task.projectId, 'tasks', task.taskId, 'edit'];
  }

  /** A click anywhere on the row opens the task, unless it was on a control in the row. */
  protected openRow(event: MouseEvent, task: Task): void {
    const control = (event.target as Element | null)?.closest(INTERACTIVE);
    // Only controls inside the row count; the scrolling region around the table is focusable too.
    if (control && (event.currentTarget as Element).contains(control)) return;
    // Selecting text in a cell shouldn't open the task.
    if (window.getSelection()?.toString()) return;
    void this.router.navigate(this.editLink(task));
  }

  protected isBusy(task: Task): boolean {
    return this.busy().has(task.taskId);
  }

  protected toggleCompleted(row: TableRow, checkbox: HTMLInputElement): void {
    const { task } = row;
    // The box ticks itself on click; it should only change once the save succeeds.
    const restore = () => (checkbox.checked = row.done);
    if (this.isBusy(task) || row.notDue) {
      restore();
      return;
    }
    const completedAt = row.done ? null : new Date().toISOString();
    this.setBusy(task.taskId, true);
    this.error.set(null);
    // TaskService patches TasksStore, so the page's tasks, and these rows, update on success.
    this.tasksApi
      .update(task.taskId, { completedAt })
      .pipe(
        finalize(() => this.setBusy(task.taskId, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: unknown) => {
          restore();
          this.error.set(mapTaskError(error).message);
        },
      });
  }

  private setBusy(taskId: number, busy: boolean): void {
    this.busy.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }
}
