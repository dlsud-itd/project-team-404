import { LabelNotFoundError } from '../../labels/label-crud/errors/label-not-found.error';
import { LabelArchivedError } from '../../labels/shared/errors/label-archived.error';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import { TaskArchivedError } from '../shared/errors/task-archived.error';
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
  setTaskArchived(
    taskId: number,
    userId: string,
    isArchived: boolean
  ): Promise<TaskRecord | null>;
};

export class TaskOrganizationService {
  constructor(private readonly dependencies: TaskOrganizationDependencies) {}

  async setPriority(
    task: TaskRecord,
    userId: string,
    priority?: TaskPriority,
    priorityId?: number
  ) {
    this.assertTaskActive(task);
    const updated = await this.dependencies.updateOwnedTask(task.id, userId, {
      ...(priority !== undefined ? { priority } : {}),
      ...(priorityId !== undefined ? { priorityId } : {}),
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
    this.assertTaskActive(task);
    const labelIds = [...new Set(requestedLabelIds)];
    const ownedLabels = await this.dependencies.findOwnedLabels(
      labelIds,
      userId
    );
    if (ownedLabels.length !== labelIds.length) {
      throw new LabelNotFoundError();
    }
    if (ownedLabels.some((label) => label.archivedAt !== null)) {
      throw new LabelArchivedError();
    }
    const labels = await this.dependencies.attachTaskLabels(
      task.id,
      labelIds,
      userId
    );
    return labels.map(toLabelModel);
  }

  async detachLabel(task: TaskRecord, userId: string, labelId: number) {
    this.assertTaskActive(task);
    const label = await this.dependencies.findOwnedLabel(labelId, userId);
    if (!label) {
      throw new LabelNotFoundError();
    }
    await this.dependencies.detachTaskLabel(task.id, labelId, userId);
    return (await this.dependencies.listTaskLabels(task.id, userId)).map(
      toLabelModel
    );
  }

  async setArchived(task: TaskRecord, userId: string, isArchived: boolean) {
    const updated = await this.dependencies.setTaskArchived(
      task.id,
      userId,
      isArchived
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return {
      taskId: updated.id,
      isArchived: updated.archivedAt !== null,
      archivedAt: updated.archivedAt,
    };
  }

  private assertTaskActive(task: TaskRecord) {
    if (task.archivedAt !== null) {
      throw new TaskArchivedError();
    }
  }
}
