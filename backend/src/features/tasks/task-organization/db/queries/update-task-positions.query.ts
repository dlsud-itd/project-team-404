import { prisma } from '../../../../../shared/db/prisma.client';
import { TaskNotFoundError } from '../../../task-crud/errors/task-not-found.error';
import { TaskReorderConflictError } from '../../errors/task-reorder-conflict.error';
import { reorderTasks } from '../../utils/reorder-tasks.util';

export async function updateTaskPositions(
  projectId: number,
  taskIds: number[],
  userId: string
) {
  return prisma.$transaction(async (transaction) => {
    const activeTasks = await transaction.task.findMany({
      where: {
        projectId,
        userId,
        deletedAt: null,
        archivedAt: null,
        isDone: false,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const activeTaskIds = new Set(activeTasks.map(({ id }) => id));

    if (taskIds.some((taskId) => !activeTaskIds.has(taskId))) {
      throw new TaskNotFoundError();
    }
    if (taskIds.length !== activeTasks.length) {
      throw new TaskReorderConflictError();
    }

    const updates = reorderTasks(taskIds);
    for (const { taskId, position } of [...updates].sort(
      (left, right) => left.taskId - right.taskId
    )) {
      const result = await transaction.task.updateMany({
        where: {
          id: taskId,
          projectId,
          userId,
          deletedAt: null,
          archivedAt: null,
          isDone: false,
        },
        data: { position },
      });
      if (result.count !== 1) {
        throw new TaskReorderConflictError();
      }
    }

    return updates;
  });
}
