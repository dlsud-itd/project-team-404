import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createTaskTimelineController } from './task-timeline.controller';
import type { TaskTimelineService } from './task-timeline.service';

describe('TaskTimelineController', () => {
  it('returns the timeline response for the authenticated user', async () => {
    const response = {
      from: '2026-11-16',
      to: '2026-11-22',
      projects: [],
      undatedCount: 0,
    };
    const service = {
      list: vi.fn().mockResolvedValue(response),
    } as unknown as TaskTimelineService;
    const controller = createTaskTimelineController(service);
    const req = { auth: { userId: 'owner-1' } } as Request;
    const res = {
      locals: { validated: { from: response.from, to: response.to } },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await controller.list(req, res, next);

    expect(service.list).toHaveBeenCalledWith('owner-1', res.locals.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(response);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes service errors to Express', async () => {
    const error = new Error('query failed');
    const service = {
      list: vi.fn().mockRejectedValue(error),
    } as unknown as TaskTimelineService;
    const controller = createTaskTimelineController(service);
    const req = { auth: { userId: 'owner-1' } } as Request;
    const res = { locals: { validated: {} } } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await controller.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
