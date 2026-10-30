import { LabelNotFoundError } from '../../labels/label-crud/errors/label-not-found.error';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type { LabelRecord } from '../../labels/shared/models/label.model';
import { toLabelModel } from '../../labels/shared/models/label.model';
import type { TaskRecord } from '../shared/models/task.model';
import { toTaskModel } from '../shared/models/task.model';
import type { TaskPriority } from '../shared/models/task.model';
import type { UpdateTaskInput } from '../task-crud/types/task-crud.types';

export type TaskOrganizationDependencies = {
  updateOwnedTask(
    taskId: number,
    userId: string,
    input: UpdateTaskInput
  ): Promise<TaskRecord | null>;
  findOwnedLabels(labelIds: number[], userId: string): Promise<LabelRecord[]>;
  attachTaskLabels(
    taskId: number,
    labelIds: number[],
    userId: string
  ): Promise<LabelRecord[]>;
  detachTaskLabel(
    taskId: number,
    labelId: number,
    userId: string
  ): Promise<unknown>;
  listTaskLabels(taskId: number, userId: string): Promise<LabelRecord[]>;
  findOwnedLabel(labelId: number, userId: string): Promise<LabelRecord | null>;
};

export class TaskOrganizationService {
  constructor(private readonly dependencies: TaskOrganizationDependencies) {}

  async setPriority(task: TaskRecord, userId: string, priority: TaskPriority) {
    const updated = await this.dependencies.updateOwnedTask(task.id, userId, {
      priority,
    });
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }

  async listLabels(task: TaskRecord, userId: string) {
    return (await this.dependencies.listTaskLabels(task.id, userId)).map(
      toLabelModel
    );
  }

  async attachLabels(
    task: TaskRecord,
    userId: string,
    requestedLabelIds: number[]
  ) {
    const labelIds = [...new Set(requestedLabelIds)];
    const ownedLabels = await this.dependencies.findOwnedLabels(
      labelIds,
      userId
    );
    if (ownedLabels.length !== labelIds.length) {
      throw new LabelNotFoundError();
    }
    const labels = await this.dependencies.attachTaskLabels(
      task.id,
      labelIds,
      userId
    );
    return labels.map(toLabelModel);
  }

  async detachLabel(task: TaskRecord, userId: string, labelId: number) {
    const label = await this.dependencies.findOwnedLabel(labelId, userId);
    if (!label) {
      throw new LabelNotFoundError();
    }
    await this.dependencies.detachTaskLabel(task.id, labelId, userId);
    return (await this.dependencies.listTaskLabels(task.id, userId)).map(
      toLabelModel
    );
  }
}
