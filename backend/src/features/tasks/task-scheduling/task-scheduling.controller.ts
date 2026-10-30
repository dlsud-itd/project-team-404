import type { RequestHandler } from 'express';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type { TaskRecord } from '../shared/models/task.model';
import type { TaskSchedulingService } from './task-scheduling.service';
import type {
  RecurrenceRuleInput,
  ScheduleTaskDateInput,
  TaskDeadlineInput,
  TaskDueDateInput,
} from './task-scheduling.types';

export function createTaskSchedulingController(service: TaskSchedulingService): {
  setScheduledDate: RequestHandler;
  setDueDate: RequestHandler;
  setDeadline: RequestHandler;
  setRecurrence: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (error instanceof TaskNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    setScheduledDate: async (req, res, next) => {
      try {
        const task = res.locals.ownedTask as TaskRecord;
        const { scheduledDate } = res.locals.validated as ScheduleTaskDateInput;
        const result = await service.setScheduledDate(
          task,
          req.auth!.userId,
          scheduledDate ?? null
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    setDueDate: async (req, res, next) => {
      try {
        const task = res.locals.ownedTask as TaskRecord;
        const { dueDate } = res.locals.validated as TaskDueDateInput;
        const result = await service.setDueDate(task, req.auth!.userId, dueDate ?? null);
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    setDeadline: async (req, res, next) => {
      try {
        const task = res.locals.ownedTask as TaskRecord;
        const { deadline } = res.locals.validated as TaskDeadlineInput;
        const result = await service.setDeadline(task, req.auth!.userId, deadline ?? null);
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    setRecurrence: async (req, res, next) => {
      try {
        const task = res.locals.ownedTask as TaskRecord;
        const { recurrence } = res.locals.validated as RecurrenceRuleInput;
        const result = await service.setRecurrence(
          task,
          req.auth!.userId,
          recurrence ?? null
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
