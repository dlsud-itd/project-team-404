import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { LabelCrudService } from './label-crud.service';
import type { LabelCrudDependencies } from './label-crud.service';
import { createLabelCrudController } from './label-crud.controller';

const label = {
  id: 8,
  userId: 'user-1',
  name: 'Work',
  color: '#f59e0b',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const labelWithCount = { ...label, _count: { taskLabels: 0 } };

describe('LabelCrudController', () => {
  it('creates a label for the authenticated user', async () => {
    const dependencies: LabelCrudDependencies = {
      createLabel: vi.fn().mockResolvedValue(label),
      listLabels: vi.fn().mockResolvedValue([labelWithCount]),
      findOwnedLabel: vi.fn().mockResolvedValue(label),
      updateOwnedLabel: vi.fn().mockResolvedValue(label),
      deleteOwnedLabel: vi.fn().mockResolvedValue(true),
    };
    const controller = createLabelCrudController(
      new LabelCrudService(dependencies)
    );
    const req = { auth: { userId: 'user-1' } } as Request;
    const res = {
      locals: { validated: { name: 'Work' } },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await controller.create(req, res, next);

    expect(dependencies.createLabel).toHaveBeenCalledWith('user-1', {
      name: 'Work',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 8, name: 'Work' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
