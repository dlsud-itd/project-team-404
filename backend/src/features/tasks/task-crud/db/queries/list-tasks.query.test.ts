import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: {
    task: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../../../../../shared/db/prisma.client';
import { listTasksQueryValidator } from '../../validators/list-tasks-query.validator';
import {
  buildListTasksOrderBy,
  buildListTasksWhere,
  listTasks,
} from './list-tasks.query';

describe('listTasks query builders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies owner, project, status, priority, date, and recurrence filters', () => {
    const filters = listTasksQueryValidator.parse({
      projectId: '18',
      status: 'active',
      priorities: 'high,low',
      dueFrom: '2026-11-10',
      dueTo: '2026-11-30',
      hasDueDate: 'true',
      recurring: 'false',
    });

    expect(buildListTasksWhere('user-123', filters)).toEqual({
      userId: 'user-123',
      deletedAt: null,
      archivedAt: null,
      projectId: 18,
      isDone: false,
      priorityLevel: {
        is: {
          name: { in: ['high', 'low'], mode: 'insensitive' },
        },
      },
      AND: [
        {
          OR: [
            { projectId: null },
            { project: { is: { isArchived: false, deletedAt: null } } },
          ],
        },
        {
          dueDate: {
            gte: new Date('2026-11-10T00:00:00.000Z'),
            lte: new Date('2026-11-30T00:00:00.000Z'),
          },
        },
        { dueDate: { not: null } },
        { OR: [{ recurrence: 'none' }, { recurrence: null }] },
      ],
    });
  });

  it('applies legacy completion and priority parameters', () => {
    const filters = listTasksQueryValidator.parse({
      isDone: 'true',
      priority: 'MEDIUM',
    });

    expect(buildListTasksWhere('user-123', filters)).toMatchObject({
      isDone: true,
      priorityLevel: {
        is: { name: { in: ['medium'], mode: 'insensitive' } },
      },
    });
  });

  it('matches any requested label using an owned-label relation', () => {
    const filters = listTasksQueryValidator.parse({ labelIds: '4,9' });

    expect(buildListTasksWhere('user-123', filters).AND).toContainEqual({
      taskLabels: {
        some: { labelId: { in: [4, 9] }, label: { userId: 'user-123' } },
      },
    });
  });

  it('requires an EXISTS match for every requested label in all mode', () => {
    const filters = listTasksQueryValidator.parse({
      labelIds: '4,9',
      labelMatch: 'all',
    });
    const where = buildListTasksWhere('user-123', filters);

    expect(where.AND).toContainEqual({
      taskLabels: { some: { labelId: 4, label: { userId: 'user-123' } } },
    });
    expect(where.AND).toContainEqual({
      taskLabels: { some: { labelId: 9, label: { userId: 'user-123' } } },
    });
  });

  it('filters overdue tasks before the user-local date and excludes completed tasks', () => {
    const filters = listTasksQueryValidator.parse({ overdue: 'true' });

    expect(() => buildListTasksWhere('user-123', filters)).toThrow(
      'An overdue date is required'
    );
    expect(
      buildListTasksWhere('user-123', filters, '2026-11-14').AND
    ).toContainEqual({
      isDone: false,
      dueDate: { lt: new Date('2026-11-14T00:00:00.000Z') },
    });
  });

  it.each(['dueDate', 'deadline', 'scheduledDate'] as const)(
    'sorts nullable %s values last in both directions',
    (orderBy) => {
      expect(buildListTasksOrderBy({ orderBy, orderDirection: 'asc' })).toEqual(
        [{ [orderBy]: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]
      );
      expect(
        buildListTasksOrderBy({ orderBy, orderDirection: 'desc' })
      ).toEqual([
        { [orderBy]: { sort: 'desc', nulls: 'last' } },
        { id: 'asc' },
      ]);
    }
  );

  it.each(['title', 'createdAt', 'updatedAt'] as const)(
    'sorts %s in both directions with a stable task ID tie-breaker',
    (orderBy) => {
      for (const orderDirection of ['asc', 'desc'] as const) {
        expect(buildListTasksOrderBy({ orderBy, orderDirection })).toEqual([
          { [orderBy]: orderDirection },
          { id: 'asc' },
        ]);
      }
    }
  );

  it('sorts priority by configured sort order and defaults to creation time', () => {
    for (const orderDirection of ['asc', 'desc'] as const) {
      expect(
        buildListTasksOrderBy({ orderBy: 'priority', orderDirection })
      ).toEqual([
        { priorityLevel: { sortOrder: orderDirection } },
        { id: 'asc' },
      ]);
    }
    expect(buildListTasksOrderBy({ orderDirection: 'asc' })).toEqual([
      { createdAt: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('uses the requested page size and offset in the database query', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);

    await listTasks(
      'user-123',
      listTasksQueryValidator.parse({
        status: 'all',
        page: '3',
        pageSize: '10',
        orderBy: 'dueDate',
      })
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      })
    );
  });
});
