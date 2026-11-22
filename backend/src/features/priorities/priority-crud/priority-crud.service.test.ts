import { describe, expect, it } from 'vitest';
import { PriorityNameTakenError } from './errors/priority-name-taken.error';
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
    };

    await expect(
      new PriorityCrudService(dependencies).create('user-1', { name: 'Work' })
    ).rejects.toBeInstanceOf(PriorityNameTakenError);
  });
});
