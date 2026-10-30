import { TaskNotFoundError } from './errors/task-not-found.error';
import type {
  CreateTaskInput,
  ListTasksFilters,
  UpdateTaskInput,
} from './types/task-crud.types';
import type { TaskRecord } from '../shared/models/task.model';
import { toTaskModel } from '../shared/models/task.model';

export type TaskCrudDependencies = {
  createTask(userId: string, input: CreateTaskInput): Promise<TaskRecord>;
  findOwnedProject(projectId: number, userId: string): Promise<unknown | null>;
  findInboxProject(userId: string): Promise<{ id: number } | null>;
  findOwnedTasks(
    userId: string,
    filters: ListTasksFilters
  ): Promise<TaskRecord[]>;
  updateOwnedTask(
    taskId: number,
    userId: string,
    input: UpdateTaskInput
  ): Promise<TaskRecord | null>;
  deleteOwnedTask(taskId: number, userId: string): Promise<boolean>;
};

export class TaskCrudService {
  constructor(private readonly dependencies: TaskCrudDependencies) {}

  async create(userId: string, input: CreateTaskInput) {
    const projectId = await this.resolveProjectId(userId, input.projectId);
    return toTaskModel(
      await this.dependencies.createTask(userId, { ...input, projectId })
    );
  }

  async list(userId: string, filters: ListTasksFilters) {
    const tasks = await this.dependencies.findOwnedTasks(userId, filters);
    return tasks.map(toTaskModel);
  }

  async get(task: TaskRecord) {
    return toTaskModel(task);
  }

  async update(task: TaskRecord, userId: string, input: UpdateTaskInput) {
    const projectId =
      input.projectId === undefined
        ? undefined
        : await this.resolveProjectId(userId, input.projectId);
    const updated = await this.dependencies.updateOwnedTask(
      task.id,
      userId,
      projectId === undefined ? input : { ...input, projectId }
    );
    if (!updated) {
      throw new TaskNotFoundError();
    }
    return toTaskModel(updated);
  }

  async delete(task: TaskRecord, userId: string): Promise<void> {
    const deleted = await this.dependencies.deleteOwnedTask(task.id, userId);
    if (!deleted) {
      throw new TaskNotFoundError();
    }
  }

  private async resolveProjectId(
    userId: string,
    projectId: number | null | undefined
  ): Promise<number> {
    if (projectId !== undefined && projectId !== null) {
      const project = await this.dependencies.findOwnedProject(
        projectId,
        userId
      );
      if (!project) {
        throw new TaskNotFoundError('Project not found');
      }
      return projectId;
    }

    const inbox = await this.dependencies.findInboxProject(userId);
    if (!inbox) {
      throw new TaskNotFoundError('Project not found');
    }
    return inbox.id;
  }
}
