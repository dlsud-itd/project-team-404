import type { TaskRecord } from '../../shared/models/task.model';
import {
  getNextOccurrence,
  type TaskRecurrence,
} from '../utils/next-occurrence.util';

export class RecurrenceService {
  getNextOccurrence(
    currentDate: Date | string,
    recurrence: TaskRecurrence,
    timeZone = 'UTC',
    weekdays: readonly number[] = []
  ) {
    return getNextOccurrence(currentDate, recurrence, timeZone, weekdays);
  }

  createNextOccurrence(task: TaskRecord, timeZone = 'UTC') {
    if (!task.recurrence || task.recurrence === 'none' || !task.dueDate) {
      return null;
    }

    const next = getNextOccurrence(
      task.dueDate,
      task.recurrence,
      timeZone,
      task.recurrence === 'weekly' ? (task.recurrenceDays ?? []) : []
    );
    // The repeat has ended: the next one would fall after its last day.
    if (task.recurrenceEndDate && next > new Date(task.recurrenceEndDate)) {
      return null;
    }
    return {
      ...task,
      scheduledDate: next.toISOString().slice(0, 10),
      dueDate: next.toISOString().slice(0, 10),
      recurrence: 'none',
    };
  }
}
