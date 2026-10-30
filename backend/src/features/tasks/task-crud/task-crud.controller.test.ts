import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { TaskRecord } from '../shared/models/task.model';
import { TaskCrudService } from './task-crud.service';
import type { TaskCrudDependencies } from './task-crud.service';
import { createTaskCrudController } from './task-crud.controller';

const task: TaskRecord = {
  id: 21,
  userId: 'owner-1',
  projectId: 4,
  title: 'Review sprint plan',
  description: 'Check the milestones',
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

function context(
  validated: unknown = { title: task.title },
  ownedTask: TaskRecord = task
) {
  const req = { auth: { userId: 'owner-1' } } as Request;
  const res = {
    locals: { validated, ownedTask },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

function controller() {
  const dependencies: TaskCrudDependencies = {
    createTask: vi.fn().mockResolvedValue(task),
    findOwnedProject: vi.fn().mockResolvedValue({ id: 4 }),
    findInboxProject: vi.fn().mockResolvedValue({ id: 4 }),
    findOwnedTasks: vi.fn().mockResolvedValue([task]),
    updateOwnedTask: vi.fn().mockResolvedValue(task),
    deleteOwnedTask: vi.fn().mockResolvedValue(true),
  };
  return createTaskCrudController(new TaskCrudService(dependencies));
}

describe('TaskCrudController', () => {
  it('creates a task with status 201', async () => {
    const actions = controller();
    const { req, res, next } = context({ title: task.title, projectId: 4 });

    await actions.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: task.title,
        description: task.description,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 with a task list', async () => {
    const actions = controller();
    const { req, res, next } = context({
      status: 'active',
      page: 1,
      pageSize: 20,
    });

    await actions.list(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 21 }),
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an owned task', () => {
    const actions = controller();
    const { req, res, next } = context(undefined, task);

    actions.get(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: task.id, title: task.title })
    );
  });

  it('returns the updated task', async () => {
    const actions = controller();
    const { req, res, next } = context({ title: 'Updated title' }, task);

    await actions.update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      taskId: task.id,
      message: 'Task updated successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the success message after soft deletion', async () => {
    const actions = controller();
    const { req, res, next } = context(undefined, task);

    await actions.delete(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Task deleted successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
