import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/db/prisma.client';
import {
  buildListTasksWhere,
  getUserToday,
} from '../../../task-crud/db/queries/list-tasks.query';
import type { ListTasksFilters } from '../../../task-crud/types/task-crud.types';
import type { BoardQuery } from '../../types/task-board.types';

export async function listBoardTasks(userId: string, query: BoardQuery) {
  const filters: ListTasksFilters = {
    ...query,
    page: 1,
    pageSize: 100,
    orderBy: 'position',
    orderDirection: 'asc',
    isArchived: false,
  };
  const overdueDate = query.overdue ? await getUserToday(userId) : undefined;
  const where = buildListTasksWhere(userId, filters, overdueDate);
  const taskOrder: Prisma.TaskOrderByWithRelationInput[] = [
    { position: 'asc' },
    { id: 'asc' },
  ];

  return prisma.$transaction(async (transaction) => {
    const [groups, todo, inProgress, recentDone] = await Promise.all([
      transaction.task.groupBy({
        by: ['boardStatus'],
        where,
        _count: { _all: true },
      }),
      transaction.task.findMany({
        where: { AND: [where, { boardStatus: 'todo' }] },
        orderBy: taskOrder,
        select: {
          id: true,
          title: true,
          boardStatus: true,
          isDone: true,
          position: true,
          doneAt: true,
        },
      }),
      transaction.task.findMany({
        where: { AND: [where, { boardStatus: 'in_progress' }] },
        orderBy: taskOrder,
        select: {
          id: true,
          title: true,
          boardStatus: true,
          isDone: true,
          position: true,
          doneAt: true,
        },
      }),
      transaction.task.findMany({
        where: { AND: [where, { boardStatus: 'done' }] },
        orderBy: [{ doneAt: 'desc' }, { id: 'desc' }],
        take: 50,
        select: { id: true },
      }),
    ]);
    const done = recentDone.length
      ? await transaction.task.findMany({
          where: {
            AND: [where, { id: { in: recentDone.map(({ id }) => id) } }],
          },
          orderBy: taskOrder,
          select: {
            id: true,
            title: true,
            boardStatus: true,
            isDone: true,
            position: true,
            doneAt: true,
          },
        })
      : [];
    const counts = { todo: 0, inProgress: 0, done: 0 };
    for (const group of groups) {
      counts[
        group.boardStatus === 'in_progress' ? 'inProgress' : group.boardStatus
      ] = group._count._all;
    }

    return {
      projectId: query.projectId ?? null,
      columns: { todo, inProgress, done },
      counts,
    };
  });
}
