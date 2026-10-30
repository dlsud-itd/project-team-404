import { describe, expect, it, vi } from 'vitest';
import { LabelNotFoundError } from '../../labels/label-crud/errors/label-not-found.error';
import type { LabelRecord } from '../../labels/shared/models/label.model';
import type { TaskRecord } from '../shared/models/task.model';
import { TaskOrganizationService } from './task-organization.service';

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
  isDone: false,
  doneAt: null,
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
  deletedAt: null,
  priorityLevel: { id: 2, name: 'medium', sortOrder: 2 },
  taskLabels: [],
};
const label: LabelRecord = {
  id: 8,
  userId: 'user-1',
  name: 'Work',
  color: '#f59e0b',
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
};

function dependencies() {
  return {
    updateOwnedTask: vi.fn().mockResolvedValue(task),
    findOwnedLabels: vi.fn().mockResolvedValue([label]),
    attachTaskLabels: vi.fn().mockResolvedValue([label]),
    detachTaskLabel: vi.fn().mockResolvedValue({ count: 1 }),
    listTaskLabels: vi.fn().mockResolvedValue([label]),
    findOwnedLabel: vi.fn().mockResolvedValue(label),
  };
}

describe('TaskOrganizationService', () => {
  it('updates the priority only for the owned task', async () => {
    const deps = dependencies();
    vi.mocked(deps.updateOwnedTask).mockResolvedValue({
      ...task,
      priorityId: 3,
      priorityLevel: { id: 3, name: 'high', sortOrder: 3 },
    });
    const service = new TaskOrganizationService(deps);

    const result = await service.setPriority(task, 'user-1', 'high');

    expect(deps.updateOwnedTask).toHaveBeenCalledWith(4, 'user-1', {
      priority: 'high',
    });
    expect(result.priority).toBe('high');
  });

  it('deduplicates label IDs before attaching them', async () => {
    const deps = dependencies();
    const service = new TaskOrganizationService(deps);

    const result = await service.attachLabels(task, 'user-1', [8, 8]);

    expect(deps.findOwnedLabels).toHaveBeenCalledWith([8], 'user-1');
    expect(deps.attachTaskLabels).toHaveBeenCalledWith(4, [8], 'user-1');
    expect(result).toHaveLength(1);
  });

  it('rejects cross-user labels before changing task links', async () => {
    const deps = dependencies();
    vi.mocked(deps.findOwnedLabels).mockResolvedValue([]);
    const service = new TaskOrganizationService(deps);

    await expect(
      service.attachLabels(task, 'user-2', [8])
    ).rejects.toBeInstanceOf(LabelNotFoundError);
    expect(deps.attachTaskLabels).not.toHaveBeenCalled();
  });

  it('allows repeated detach operations while retaining task labels state', async () => {
    const deps = dependencies();
    const service = new TaskOrganizationService(deps);

    await service.detachLabel(task, 'user-1', 8);
    await service.detachLabel(task, 'user-1', 8);

    expect(deps.detachTaskLabel).toHaveBeenCalledTimes(2);
    expect(deps.detachTaskLabel).toHaveBeenCalledWith(4, 8, 'user-1');
  });
});
