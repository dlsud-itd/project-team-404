import { describe, expect, it, vi } from 'vitest';
import { TaskCrudService } from './task-crud.service';
import type { TaskRecord } from '../shared/models/task.model';
import { TaskNotFoundError } from './errors/task-crud.errors';

const task: TaskRecord = {
  id: 12,
  userId: 'user-123',
  projectId: 7,
  title: 'Plan sprint review',
  description: 'Outline the demo and risks.',
  priority: 'high',
  dueDate: new Date('2026-10-31T00:00:00.000Z'),
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  deletedAt: null,
};

function dependencies() {
  return {
    createTask: vi.fn().mockResolvedValue(task),
    findOwnedProject: vi.fn().mockResolvedValue({ id: 7 }),
    findInboxProject: vi.fn().mockResolvedValue({ id: 7 }),
    findOwnedTasks: vi.fn().mockResolvedValue([task]),
    findOwnedTask: vi.fn().mockResolvedValue(task),
    updateOwnedTask: vi.fn().mockResolvedValue(task),
    deleteOwnedTask: vi.fn().mockResolvedValue(true),
  };
}

describe('TaskCrudService', () => {
  it('creates a task for the authenticated owner', async () => {
    const deps = dependencies();
    const service = new TaskCrudService(deps);

    await service.create('user-123', {
      title: 'Plan sprint review',
      description: 'Outline the demo and risks.',
      projectId: 7,
      dueDate: '2026-10-31',
      priority: 'high',
    });

    expect(deps.createTask).toHaveBeenCalledWith('user-123', {
      title: 'Plan sprint review',
      description: 'Outline the demo and risks.',
      projectId: 7,
      dueDate: '2026-10-31',
      priority: 'high',
    });
  });

  it('does not create a task for a project the user does not own', async () => {
    const deps = dependencies();
    vi.mocked(deps.findOwnedProject).mockResolvedValue(null);
    const service = new TaskCrudService(deps);

    await expect(
      service.create('user-123', {
        title: 'Private project task',
        projectId: 99,
      })
    ).rejects.toMatchObject({ message: 'Project not found' });

    expect(deps.createTask).not.toHaveBeenCalled();
  });

  it('lists tasks for the authenticated user without private fields', async () => {
    const deps = dependencies();
    const service = new TaskCrudService(deps);

    const filters = {
      projectId: 7,
      status: 'active' as const,
      page: 1,
      pageSize: 20,
    };
    const result = await service.list('user-123', filters);

    expect(deps.findOwnedTasks).toHaveBeenCalledWith('user-123', filters);
    expect(result[0]).not.toHaveProperty('userId');
    expect(result[0]).not.toHaveProperty('deletedAt');
  });

  it('updates a task when it is owned by the user', async () => {
    const deps = dependencies();
    const service = new TaskCrudService(deps);

    await service.update(task, 'user-123', { title: 'Plan sprint review v2' });

    expect(deps.updateOwnedTask).toHaveBeenCalledWith(12, 'user-123', {
      title: 'Plan sprint review v2',
    });
  });

  it('moves a task only to a project owned by the user', async () => {
    const deps = dependencies();
    const service = new TaskCrudService(deps);

    await service.update(task, 'user-123', { projectId: 8 });

    expect(deps.findOwnedProject).toHaveBeenCalledWith(8, 'user-123');
    expect(deps.updateOwnedTask).toHaveBeenCalledWith(12, 'user-123', {
      projectId: 8,
    });

    vi.mocked(deps.findOwnedProject).mockResolvedValue(null);
    await expect(
      service.update(task, 'user-123', { projectId: 99 })
    ).rejects.toMatchObject({ message: 'Project not found' });
  });

  it('returns not found when the task record is stale or missing', async () => {
    const deps = dependencies();
    const service = new TaskCrudService(deps);

    vi.mocked(deps.updateOwnedTask).mockResolvedValue(null);
    await expect(
      service.update(task, 'user-123', { title: 'New title' })
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    vi.mocked(deps.deleteOwnedTask).mockResolvedValue(false);
    await expect(service.delete(task, 'user-123')).rejects.toBeInstanceOf(
      TaskNotFoundError
    );
  });
});
