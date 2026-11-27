import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type {
  BoardQuery,
  BoardReorderInput,
  TaskBoardResult,
} from './types/task-board.types';

export type TaskBoardDependencies = {
  findOwnedProject(
    projectId: number,
    userId: string
  ): Promise<{ isArchived: boolean } | null>;
  listBoardTasks(userId: string, query: BoardQuery): Promise<TaskBoardResult>;
  moveBoardTask(
    userId: string,
    input: BoardReorderInput
  ): Promise<{
    projectId: number;
    boardStatus: BoardReorderInput['boardStatus'];
    tasks: number[];
  }>;
};

export class TaskBoardService {
  constructor(private readonly dependencies: TaskBoardDependencies) {}

  async list(userId: string, query: BoardQuery) {
    if (query.projectId !== undefined) {
      await this.requireActiveProject(query.projectId, userId);
    }
    return this.dependencies.listBoardTasks(userId, query);
  }

  async move(userId: string, input: BoardReorderInput) {
    await this.requireActiveProject(input.projectId, userId);
    return this.dependencies.moveBoardTask(userId, input);
  }

  private async requireActiveProject(projectId: number, userId: string) {
    const project = await this.dependencies.findOwnedProject(projectId, userId);
    if (!project || project.isArchived) {
      throw new TaskNotFoundError('Project not found');
    }
  }
}
