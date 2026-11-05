import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUpcomingTasksService } from './current-upcoming-tasks.service';
import { createCurrentUpcomingTasksController } from './current-upcoming-tasks.controller';

function context(validated: unknown = { days: 7 }) {
  const req = { auth: { userId: 'owner-1' } } as Request;
  const res = {
    locals: { validated },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('CurrentUpcomingTasksController', () => {
  it('returns the service results in the tasks response shape', async () => {
    const tasks = [{ id: 21, title: 'Review sprint plan' }];
    const service = {
      list: vi.fn().mockResolvedValue(tasks),
    } as unknown as CurrentUpcomingTasksService;
    const controller = createCurrentUpcomingTasksController(service);
    const { req, res, next } = context({ days: 3 });

    await controller.list(req, res, next);

    expect(service.list).toHaveBeenCalledWith('owner-1', 3);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tasks });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to the error middleware', async () => {
    const error = new Error('Database unavailable');
    const service = {
      list: vi.fn().mockRejectedValue(error),
    } as unknown as CurrentUpcomingTasksService;
    const controller = createCurrentUpcomingTasksController(service);
    const { req, res, next } = context();

    await controller.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
