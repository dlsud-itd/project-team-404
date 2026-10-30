import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { TaskRecord } from '../models/task.model';
import { loadOwnedTaskMiddleware } from './load-owned-task.middleware';

const task: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  title: 'Review sprint plan',
  description: null,
  priorityId: 2,
  dueDate: null,
  scheduledDate: null,
  deadline: null,
  recurrence: 'none',
  isDone: false,
  doneAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  priorityLevel: { id: 2, name: 'medium', sortOrder: 2 },
  taskLabels: [],
};

function context() {
  const req = { auth: { userId: 'owner-1' } } as Request;
  const res = {
    locals: { validated: 21 },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('loadOwnedTaskMiddleware', () => {
  it('loads an owned task for the authenticated user', async () => {
    const findTask = vi.fn().mockResolvedValue(task);
    const middleware = loadOwnedTaskMiddleware(findTask);
    const { req, res, next } = context();

    await middleware(req, res, next);

    expect(findTask).toHaveBeenCalledWith(21, 'owner-1');
    expect(res.locals.ownedTask).toBe(task);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 404 when the task is missing or belongs to another user', async () => {
    const middleware = loadOwnedTaskMiddleware(vi.fn().mockResolvedValue(null));
    const { req, res, next } = context();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
    expect(next).not.toHaveBeenCalled();
  });
});
