import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';
import { TaskNotFoundError } from '../../../task-crud/errors/task-not-found.error';
import { updateTask } from '../../../task-crud/db/queries/update-task.query';
import { TaskReorderConflictError } from '../../../task-organization/errors/task-reorder-conflict.error';
import type { BoardReorderInput } from '../../types/task-board.types';

export async function moveBoardTask(userId: string, input: BoardReorderInput) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const requestedTasks = await transaction.task.findMany({
          where: { id: { in: input.tasks }, userId },
          select: {
            id: true,
            projectId: true,
            boardStatus: true,
            isDone: true,
            position: true,
            doneAt: true,
            deletedAt: true,
            archivedAt: true,
          },
        });
        if (
          requestedTasks.length !== input.tasks.length ||
          requestedTasks.some(
            (task) =>
              task.projectId !== input.projectId ||
              task.deletedAt !== null ||
              task.archivedAt !== null
          )
        ) {
          throw new TaskNotFoundError();
        }

        const currentTasks = await transaction.task.findMany({
          where: {
            userId,
            projectId: input.projectId,
            deletedAt: null,
            archivedAt: null,
          },
          select: {
            id: true,
            projectId: true,
            boardStatus: true,
            isDone: true,
            position: true,
            doneAt: true,
            deletedAt: true,
            archivedAt: true,
          },
        });
        const tasksById = new Map(currentTasks.map((task) => [task.id, task]));
        const requestedById = new Map(
          requestedTasks.map((task) => [task.id, task])
        );
        const targetTasks = currentTasks.filter(
          (task) => task.boardStatus === input.boardStatus
        );
        const visibleTargetTasks =
          input.boardStatus === 'done' && targetTasks.length > 50
            ? [...targetTasks]
                .sort(
                  (left, right) =>
                    (right.doneAt?.getTime() ?? 0) -
                      (left.doneAt?.getTime() ?? 0) ||
                    left.position - right.position ||
                    left.id - right.id
                )
                .slice(0, 50)
            : targetTasks;
        const visibleTargetIds = new Set(
          visibleTargetTasks.map((task) => task.id)
        );
        const movedTasks = input.tasks.filter(
          (taskId) =>
            requestedById.get(taskId)?.boardStatus !== input.boardStatus
        );
        if (
          movedTasks.length > 1 ||
          visibleTargetTasks.length + (movedTasks.length === 1 ? 1 : 0) !==
            input.tasks.length ||
          input.tasks.filter((taskId) => visibleTargetIds.has(taskId))
            .length !== visibleTargetIds.size
        ) {
          throw new TaskReorderConflictError();
        }

        const movedTaskId = movedTasks[0];
        const movedTask =
          movedTaskId === undefined ? undefined : tasksById.get(movedTaskId);
        if (movedTasks.length === 1 && !movedTask) {
          throw new TaskNotFoundError();
        }

        if (movedTask && movedTask.isDone !== (input.boardStatus === 'done')) {
          const updated = await updateTask(
            movedTask.id,
            userId,
            { isDone: input.boardStatus === 'done' },
            transaction
          );
          if (!updated) throw new TaskReorderConflictError();
        }

        for (const [position, taskId] of input.tasks.entries()) {
          const task = tasksById.get(taskId)!;
          const isMoved = movedTask?.id === taskId;
          const expectedStatus =
            isMoved && task.isDone && input.boardStatus !== 'done'
              ? 'todo'
              : isMoved && input.boardStatus === 'done'
                ? 'done'
                : task.boardStatus;
          const result = await transaction.task.updateMany({
            where: {
              id: taskId,
              userId,
              projectId: input.projectId,
              deletedAt: null,
              archivedAt: null,
              boardStatus: expectedStatus,
              isDone: input.boardStatus === 'done',
            },
            data: {
              boardStatus: input.boardStatus,
              position,
            },
          });
          if (result.count !== 1) throw new TaskReorderConflictError();
        }

        return {
          projectId: input.projectId,
          boardStatus: input.boardStatus,
          tasks: input.tasks,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isPrismaSerializationConflict(error)) {
      throw new TaskReorderConflictError();
    }
    throw error;
  }
}

function isPrismaSerializationConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2034'
  );
}
