import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type { TaskRecord } from '../shared/models/task.model';
import { TaskOrganizationService } from './task-organization.service';
import type { TaskOrganizationDependencies } from './task-organization.service';
import { createTaskOrganizationController } from './task-organization.controller';

const task: TaskRecord = {
  id: 4,
  userId: 'user-1',
  projectId: null,
  title: 'Organize tasks',
  description: null,
  priorityId: 2,
  scheduledDate: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  isDone: false,
  doneAt: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  priorityLevel: {
    id: 2,
    userId: 'user-1',
    name: 'medium',
    color: '#a3a3a3',
    isDefault: true,
    sortOrder: 2,
    deletedAt: null,
    createdAt: new Date('2026-10-30T00:00:00.000Z'),
    updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  },
  taskLabels: [],
};

function setup() {
  const dependencies: TaskOrganizationDependencies = {
    updateOwnedTask: vi.fn().mockResolvedValue(task),
    findOwnedLabels: vi.fn().mockResolvedValue([]),
    attachTaskLabels: vi.fn().mockResolvedValue([]),
    detachTaskLabel: vi.fn().mockResolvedValue({ count: 0 }),
    listTaskLabels: vi.fn().mockResolvedValue([]),
    findOwnedLabel: vi.fn().mockResolvedValue(null),
    setTaskArchived: vi.fn().mockResolvedValue({
      ...task,
      archivedAt: new Date(),
    }),
  };
  const controller = createTaskOrganizationController(
    new TaskOrganizationService(dependencies)
  );
  const req = { auth: { userId: 'user-1' } } as Request;
  const res = {
    locals: { ownedTask: task, validated: { priority: 'high' } },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { controller, dependencies, req, res, next };
}

describe('TaskOrganizationController', () => {
  it('returns the updated task after changing priority', async () => {
    const { controller, req, res, next, dependencies } = setup();

    await controller.setPriority(req, res, next);

    expect(dependencies.updateOwnedTask).toHaveBeenCalledWith(4, 'user-1', {
      priority: 'high',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when an owned task update is no longer available', async () => {
    const { controller, req, res, next, dependencies } = setup();
    vi.mocked(dependencies.updateOwnedTask).mockResolvedValue(null);

    await controller.setPriority(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: new TaskNotFoundError().message,
    });
  });
});
