import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { OverdueTasksService } from './overdue-tasks.service';
import { createOverdueTasksController } from './overdue-tasks.controller';

function context() {
  const req = { auth: { userId: 'owner-1' } } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('OverdueTasksController', () => {
  it('returns the service results in the tasks response shape', async () => {
    const tasks = [{ id: 21, title: 'Review sprint plan' }];
    const service = {
      list: vi.fn().mockResolvedValue(tasks),
    } as unknown as OverdueTasksService;
    const controller = createOverdueTasksController(service);
    const { req, res, next } = context();

    await controller.list(req, res, next);

    expect(service.list).toHaveBeenCalledWith('owner-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tasks });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to the error middleware', async () => {
    const error = new Error('Database unavailable');
    const service = {
      list: vi.fn().mockRejectedValue(error),
    } as unknown as OverdueTasksService;
    const controller = createOverdueTasksController(service);
    const { req, res, next } = context();

    await controller.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
