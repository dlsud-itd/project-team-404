import { PriorityNameTakenError } from './errors/priority-name-taken.error';
import { LastPriorityError } from './errors/last-priority.error';
import { ReassignRequiredError } from './errors/reassign-required.error';
import { PriorityNotFoundError } from './errors/priority-not-found.error';
import {
  toPriorityModel,
  type PriorityModel,
  type PriorityRecord,
} from './models/priority.model';
import type {
  CreatePriorityInput,
  UpdatePriorityInput,
  ReorderPrioritiesInput,
  DeletePriorityQuery,
} from './types/priority-crud.types';

export type PriorityCrudDependencies = {
  listPriorities(userId: string): Promise<PriorityRecord[]>;
  createPriority(
    userId: string,
    input: CreatePriorityInput
  ): Promise<PriorityRecord>;
  getPriority(
    priorityId: number,
    userId: string
  ): Promise<PriorityRecord | null>;
  updatePriority(
    priorityId: number,
    userId: string,
    input: UpdatePriorityInput
  ): Promise<PriorityRecord | null>;
  setDefaultPriority(
    priorityId: number,
    userId: string
  ): Promise<PriorityRecord | null>;
  reorderPriorities(userId: string, ids: number[]): Promise<PriorityRecord[]>;
  deletePriorityAndReassign(
    priorityId: number,
    userId: string,
    query: DeletePriorityQuery
  ): Promise<PriorityRecord | null>;
};

export class PriorityCrudService {
  constructor(private readonly dependencies: PriorityCrudDependencies) {}

  async list(userId: string): Promise<PriorityModel[]> {
    return (await this.dependencies.listPriorities(userId)).map(
      toPriorityModel
    );
  }

  async create(
    userId: string,
    input: CreatePriorityInput
  ): Promise<PriorityModel> {
    try {
      return toPriorityModel(
        await this.dependencies.createPriority(userId, input)
      );
    } catch (error) {
      if (isPriorityNameTaken(error)) {
        throw new PriorityNameTakenError();
      }
      throw error;
    }
  }

  async get(priorityId: number, userId: string): Promise<PriorityModel> {
    const priority = await this.dependencies.getPriority(priorityId, userId);
    if (!priority) {
      throw new PriorityNotFoundError();
    }
    return toPriorityModel(priority);
  }

  async update(
    priorityId: number,
    userId: string,
    input: UpdatePriorityInput
  ): Promise<PriorityModel> {
    try {
      const priority = await this.dependencies.updatePriority(
        priorityId,
        userId,
        input
      );
      if (!priority) {
        throw new PriorityNotFoundError();
      }
      return toPriorityModel(priority);
    } catch (error) {
      if (isPriorityNameTaken(error)) {
        throw new PriorityNameTakenError();
      }
      throw error;
    }
  }

  async setDefault(priorityId: number, userId: string): Promise<PriorityModel> {
    const priority = await this.dependencies.setDefaultPriority(
      priorityId,
      userId
    );
    if (!priority) {
      throw new PriorityNotFoundError();
    }
    return toPriorityModel(priority);
  }

  async reorder(
    userId: string,
    input: ReorderPrioritiesInput
  ): Promise<PriorityModel[]> {
    const priorities = await this.dependencies.reorderPriorities(
      userId,
      input.priorityIds
    );
    return priorities.map(toPriorityModel);
  }

  async delete(
    priorityId: number,
    userId: string,
    query: DeletePriorityQuery
  ): Promise<PriorityModel> {
    try {
      const priority = await this.dependencies.deletePriorityAndReassign(
        priorityId,
        userId,
        query
      );
      if (!priority) {
        throw new PriorityNotFoundError();
      }
      return toPriorityModel(priority);
    } catch (error) {
      if (
        error instanceof LastPriorityError ||
        error instanceof ReassignRequiredError
      ) {
        throw error;
      }
      throw error;
    }
  }
}

function isPriorityNameTaken(error: unknown): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 'P2002' ||
    !('meta' in error) ||
    typeof error.meta !== 'object' ||
    error.meta === null ||
    !('target' in error.meta)
  ) {
    return false;
  }

  const target = error.meta.target;
  if (
    Array.isArray(target) &&
    target.every((field) => typeof field === 'string')
  ) {
    const hasUser = target.includes('userId') || target.includes('user_id');
    const hasName = target.some(
      (field) => field === 'name' || field.startsWith('lower(name')
    );
    return hasUser && hasName;
  }

  return (
    target === 'tbl_priority_level_user_name_key' ||
    target === 'tbl_priority_level_user_name_active_key'
  );
}
