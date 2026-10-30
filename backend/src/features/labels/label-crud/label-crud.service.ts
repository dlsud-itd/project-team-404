import { Prisma } from '@prisma/client';
import { LabelNameTakenError } from './errors/label-name-taken.error';
import { LabelNotFoundError } from './errors/label-not-found.error';
import type { LabelRecord } from '../shared/models/label.model';
import { toLabelModel } from '../shared/models/label.model';
import type {
  CreateLabelInput,
  UpdateLabelInput,
} from './types/label-crud.types';

export type LabelCrudDependencies = {
  createLabel(userId: string, input: CreateLabelInput): Promise<LabelRecord>;
  listLabels(userId: string): Promise<LabelRecord[]>;
  findOwnedLabel(labelId: number, userId: string): Promise<LabelRecord | null>;
  updateOwnedLabel(
    labelId: number,
    userId: string,
    input: UpdateLabelInput
  ): Promise<LabelRecord | null>;
  deleteOwnedLabel(labelId: number, userId: string): Promise<boolean>;
};

export class LabelCrudService {
  constructor(private readonly dependencies: LabelCrudDependencies) {}

  async create(userId: string, input: CreateLabelInput) {
    try {
      return toLabelModel(await this.dependencies.createLabel(userId, input));
    } catch (error) {
      if (isLabelNameConflict(error)) {
        throw new LabelNameTakenError();
      }
      throw error;
    }
  }

  async list(userId: string) {
    return (await this.dependencies.listLabels(userId)).map(toLabelModel);
  }

  async get(labelId: number, userId: string) {
    const label = await this.dependencies.findOwnedLabel(labelId, userId);
    if (!label) {
      throw new LabelNotFoundError();
    }
    return toLabelModel(label);
  }

  async update(labelId: number, userId: string, input: UpdateLabelInput) {
    try {
      const label = await this.dependencies.updateOwnedLabel(
        labelId,
        userId,
        input
      );
      if (!label) {
        throw new LabelNotFoundError();
      }
      return toLabelModel(label);
    } catch (error) {
      if (isLabelNameConflict(error)) {
        throw new LabelNameTakenError();
      }
      throw error;
    }
  }

  async delete(labelId: number, userId: string) {
    if (!(await this.dependencies.deleteOwnedLabel(labelId, userId))) {
      throw new LabelNotFoundError();
    }
  }
}

function isLabelNameConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const target = error.meta?.target;
  return (
    (Array.isArray(target) &&
      (target.includes('userId') || target.includes('user_id')) &&
      target.includes('name')) ||
    target === 'tbl_label_user_name_key'
  );
}
