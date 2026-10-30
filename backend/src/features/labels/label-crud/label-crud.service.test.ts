import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { LabelNameTakenError } from './errors/label-name-taken.error';
import { LabelNotFoundError } from './errors/label-not-found.error';
import { LabelCrudService } from './label-crud.service';
import type { LabelRecord } from '../shared/models/label.model';

const label: LabelRecord = {
  id: 3,
  userId: 'user-1',
  name: 'Work',
  color: '#f59e0b',
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
};

function dependencies() {
  return {
    createLabel: vi.fn().mockResolvedValue(label),
    listLabels: vi.fn().mockResolvedValue([label]),
    findOwnedLabel: vi.fn().mockResolvedValue(label),
    updateOwnedLabel: vi.fn().mockResolvedValue(label),
    deleteOwnedLabel: vi.fn().mockResolvedValue(true),
  };
}

describe('LabelCrudService', () => {
  it('creates and lists only through the authenticated user scope', async () => {
    const deps = dependencies();
    const service = new LabelCrudService(deps);

    await service.create('user-1', { name: 'Work' });
    const labels = await service.list('user-1');

    expect(deps.createLabel).toHaveBeenCalledWith('user-1', { name: 'Work' });
    expect(deps.listLabels).toHaveBeenCalledWith('user-1');
    expect(labels[0]).not.toHaveProperty('userId');
  });

  it('returns not found for a label not owned by the user', async () => {
    const deps = dependencies();
    vi.mocked(deps.findOwnedLabel).mockResolvedValue(null);
    const service = new LabelCrudService(deps);

    await expect(service.get(3, 'user-2')).rejects.toBeInstanceOf(
      LabelNotFoundError
    );
  });

  it('reports a duplicate name as a conflict', async () => {
    const deps = dependencies();
    vi.mocked(deps.createLabel).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate label', {
        code: 'P2002',
        clientVersion: '6.19.0',
        meta: { target: ['user_id', 'name'] },
      })
    );
    const service = new LabelCrudService(deps);

    await expect(
      service.create('user-1', { name: 'Work' })
    ).rejects.toBeInstanceOf(LabelNameTakenError);
  });

  it('deletes only an owned label', async () => {
    const deps = dependencies();
    const service = new LabelCrudService(deps);

    await service.delete(3, 'user-1');
    expect(deps.deleteOwnedLabel).toHaveBeenCalledWith(3, 'user-1');
    vi.mocked(deps.deleteOwnedLabel).mockResolvedValue(false);
    await expect(service.delete(3, 'user-2')).rejects.toBeInstanceOf(
      LabelNotFoundError
    );
  });
});
