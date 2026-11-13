import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PrioritiesStore } from '../../../../settings/state/priorities.store';
import type { Task } from '../../../../tasks/shared/types/task.types';
import { formatDate } from '../../../../tasks/task-scheduling/utils/date-format.util';
import type { TaskDayGroup } from '../../types/current-upcoming.types';

/** One day bucket (Today, Tomorrow or Later) of the Current & Upcoming section. */
@Component({
  selector: 'app-task-group',
  imports: [RouterLink],
  templateUrl: './task-group.html',
  styleUrl: './task-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskGroup {
  readonly group = input.required<TaskDayGroup>();

  protected readonly headingId = computed(() => `task-group-${this.group().key}`);
  /** Only Later spans several days, so only its tasks show their date. */
  protected readonly showDates = computed(() => this.group().key === 'later');

  private readonly priorities = inject(PrioritiesStore);

  protected priorityLabel(task: Task): string {
    return this.priorities.nameOf(task.priorityId);
  }

  protected priorityColor(task: Task): string {
    return this.priorities.colorOf(task.priorityId);
  }

  protected dueLabel(task: Task): string {
    return task.dueDate ? formatDate(task.dueDate) : '';
  }

  /** Tasks whose project was deleted have no page to edit them on. */
  protected editLink(task: Task): (string | number)[] | null {
    return task.projectId > 0 ? ['/projects', task.projectId, 'tasks', task.taskId, 'edit'] : null;
  }
}
