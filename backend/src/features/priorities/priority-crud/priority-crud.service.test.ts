import { describe, expect, it } from 'vitest';
import { PriorityNameTakenError } from './errors/priority-name-taken.error';
import { PriorityNotFoundError } from './errors/priority-not-found.error';
import { DefaultPriorityArchiveError } from './errors/default-priority-archive.error';
import { PriorityCrudService } from './priority-crud.service';
import type { PriorityCrudDependencies } from './priority-crud.service';

describe('PriorityCrudService', () => {
  it('maps the expression-index duplicate error to a name conflict', async () => {
    const duplicateError = Object.assign(
      new Error('Unique constraint failed'),
      {
        code: 'P2002',
        meta: { target: ['user_id', 'lower(name::text)'] },
      }
    );
    const dependencies: PriorityCrudDependencies = {
      listPriorities: async () => [],
      createPriority: async () => {
        throw duplicateError;
      },
      getPriority: async () => null,
      updatePriority: async () => null,
      setDefaultPriority: async () => null,
      reorderPriorities: async () => [],
      deletePriorityAndReassign: async () => null,
      setPriorityArchived: async () => null,
    };

    await expect(
      new PriorityCrudService(dependencies).create('user-1', { name: 'Work' })
    ).rejects.toBeInstanceOf(PriorityNameTakenError);
  });

  describe('setArchived', () => {
    const record = {
      id: 3,
      userId: 'user-1',
      name: 'Low',
      color: '#3B82F6',
      isDefault: false,
      sortOrder: 1,
      archivedAt: new Date('2026-11-27T00:00:00.000Z'),
      deletedAt: null,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      _count: { tasks: 4 },
    };
    const base: Omit<PriorityCrudDependencies, 'setPriorityArchived'> = {
      listPriorities: async () => [],
      createPriority: async () => record,
      getPriority: async () => null,
      updatePriority: async () => null,
      setDefaultPriority: async () => null,
      reorderPriorities: async () => [],
      deletePriorityAndReassign: async () => null,
    };

    it('returns the level marked archived, keeping its task count', async () => {
      const calls: unknown[][] = [];
      const service = new PriorityCrudService({
        ...base,
        setPriorityArchived: async (...args) => {
          calls.push(args);
          return record;
        },
      });

      const level = await service.setArchived(3, 'user-1', true);

      expect(calls).toEqual([[3, 'user-1', true]]);
      expect(level).toMatchObject({
        id: 3,
        isArchived: true,
        archivedAt: record.archivedAt,
        taskCount: 4,
      });
    });

    it('reports a level that is not the user’s as not found', async () => {
      const service = new PriorityCrudService({
        ...base,
        setPriorityArchived: async () => null,
      });

      await expect(
        service.setArchived(99, 'user-1', true)
      ).rejects.toBeInstanceOf(PriorityNotFoundError);
    });

    it('passes the default-level refusal on', async () => {
      const service = new PriorityCrudService({
        ...base,
        setPriorityArchived: async () => {
          throw new DefaultPriorityArchiveError();
        },
      });

      await expect(service.setArchived(3, 'user-1', true)).rejects.toBeInstanceOf(
        DefaultPriorityArchiveError
      );
    });
  });
});
