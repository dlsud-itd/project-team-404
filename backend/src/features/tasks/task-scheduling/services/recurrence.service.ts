import type { TaskRecord } from '../../shared/models/task.model';
import {
  getNextOccurrence,
  type TaskRecurrence,
} from '../utils/next-occurrence.util';

export class RecurrenceService {
  getNextOccurrence(
    currentDate: Date | string,
    recurrence: TaskRecurrence,
    timeZone = 'UTC'
  ) {
    return getNextOccurrence(currentDate, recurrence, timeZone);
  }

  createNextOccurrence(task: TaskRecord, timeZone = 'UTC') {
    if (!task.recurrence || task.recurrence === 'none' || !task.dueDate) {
      return null;
    }

    const next = getNextOccurrence(task.dueDate, task.recurrence, timeZone);
    return {
      ...task,
      scheduledDate: next.toISOString().slice(0, 10),
      dueDate: next.toISOString().slice(0, 10),
      recurrence: 'none',
    };
  }
}
