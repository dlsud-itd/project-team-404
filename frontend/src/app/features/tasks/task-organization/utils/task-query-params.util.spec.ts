import { convertToParamMap } from '@angular/router';
import { DEFAULT_TASK_QUERY, type TaskQuery } from '../types/task-query.types';
import {
  activeFilterCount,
  hasInvalidRange,
  sameTaskQuery,
  taskQueryFromParams,
  taskQueryToParams,
  toTaskListFilter,
  updateTaskQuery,
} from './task-query-params.util';

const query = (changes: Partial<TaskQuery> = {}): TaskQuery => ({
  ...DEFAULT_TASK_QUERY,
  ...changes,
});
const fromUrl = (params: Record<string, string>) => taskQueryFromParams(convertToParamMap(params));

describe('taskQueryFromParams', () => {
  it('gives the default query for a plain URL', () => {
    expect(fromUrl({})).toEqual(DEFAULT_TASK_QUERY);
  });

  it('reads every filter and the sort', () => {
    expect(
      fromUrl({
        priorities: 'High,urgent',
        labelIds: '4,9',
        labelMatch: 'all',
        due: 'custom',
        dueFrom: '2026-11-10',
        dueTo: '2026-11-30',
        recurring: 'false',
        status: 'active',
        orderBy: 'deadline',
        orderDirection: 'desc',
      }),
    ).toEqual({
      priorities: ['high', 'urgent'],
      labelIds: [4, 9],
      labelMatch: 'all',
      due: 'custom',
      dueFrom: '2026-11-10',
      dueTo: '2026-11-30',
      recurring: false,
      status: 'active',
      orderBy: 'deadline',
      orderDirection: 'desc',
    });
  });

  it('still reads the Sprint 3 single priority and label params', () => {
    expect(fromUrl({ priority: 'High', labelId: '7' })).toEqual(
      query({ priorities: ['high'], labelIds: [7] }),
    );
  });

  it('ignores malformed values instead of failing', () => {
    expect(
      fromUrl({
        labelIds: '4,abc,-1,0,4',
        due: 'someday',
        dueFrom: '2026-02-30',
        recurring: 'maybe',
        status: 'done',
        orderBy: 'colour',
        orderDirection: 'desc',
        labelMatch: 'every',
      }),
    ).toEqual(query({ labelIds: [4] }));
  });

  it('treats a bare date range as a custom range', () => {
    expect(fromUrl({ dueTo: '2026-11-30' })).toEqual(query({ due: 'custom', dueTo: '2026-11-30' }));
  });

  it('drops dates that belong to no custom range', () => {
    expect(fromUrl({ due: 'today', dueFrom: '2026-11-10' })).toEqual(query({ due: 'today' }));
  });

  it('lets the status win over overdue, which the server refuses with completed', () => {
    expect(fromUrl({ due: 'overdue', status: 'completed' })).toEqual(
      query({ status: 'completed' }),
    );
  });
});

describe('taskQueryToParams', () => {
  it('turns every default into null so a merge navigation removes it', () => {
    const params = taskQueryToParams(DEFAULT_TASK_QUERY);

    expect(Object.values(params).every((value) => value === null)).toBe(true);
    // The Sprint 3 keys are always cleared.
    expect(params).toHaveProperty('priority', null);
    expect(params).toHaveProperty('labelId', null);
  });

  it('writes a query the parser reads back unchanged', () => {
    const original = query({
      priorities: ['high', 'low'],
      labelIds: [4, 9],
      labelMatch: 'all',
      due: 'custom',
      dueFrom: '2026-11-10',
      dueTo: null,
      recurring: true,
      status: 'completed',
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });
    const params = taskQueryToParams(original);
    const nonNull = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null),
    ) as Record<string, string>;

    expect(nonNull).toEqual({
      priorities: 'high,low',
      labelIds: '4,9',
      labelMatch: 'all',
      due: 'custom',
      dueFrom: '2026-11-10',
      recurring: 'true',
      status: 'completed',
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });
    expect(fromUrl(nonNull)).toEqual(original);
  });

  it('leaves out label matching for fewer than two labels and direction without a sort', () => {
    const params = taskQueryToParams(
      query({ labelIds: [4], labelMatch: 'all', orderDirection: 'desc' }),
    );

    expect(params['labelMatch']).toBeNull();
    expect(params['orderDirection']).toBeNull();
  });
});

describe('updateTaskQuery', () => {
  it('lets the newest of overdue and completed win', () => {
    const overdue = query({ due: 'overdue' });
    expect(updateTaskQuery(overdue, { status: 'completed' })).toEqual(
      query({ status: 'completed' }),
    );

    const completed = query({ status: 'completed' });
    expect(updateTaskQuery(completed, { due: 'overdue' })).toEqual(query({ due: 'overdue' }));
  });

  it('forgets the custom range once another due preset is picked', () => {
    const custom = query({ due: 'custom', dueFrom: '2026-11-10', dueTo: '2026-11-30' });

    expect(updateTaskQuery(custom, { due: 'today' })).toEqual(query({ due: 'today' }));
  });

  it('resets the direction when the sort goes back to the default order', () => {
    const sorted = query({ orderBy: 'title', orderDirection: 'desc' });

    expect(updateTaskQuery(sorted, { orderBy: null })).toEqual(DEFAULT_TASK_QUERY);
  });
});

describe('activeFilterCount', () => {
  it('counts each narrowing group once and ignores the sort', () => {
    expect(activeFilterCount(DEFAULT_TASK_QUERY)).toBe(0);
    expect(activeFilterCount(query({ orderBy: 'title' }))).toBe(0);
    expect(
      activeFilterCount(
        query({
          priorities: ['high', 'low'],
          labelIds: [1, 2],
          due: 'none',
          recurring: false,
          status: 'active',
        }),
      ),
    ).toBe(5);
  });

  it('does not count a custom range with no dates yet', () => {
    expect(activeFilterCount(query({ due: 'custom' }))).toBe(0);
    expect(activeFilterCount(query({ due: 'custom', dueTo: '2026-11-30' }))).toBe(1);
  });
});

describe('sameTaskQuery', () => {
  it('compares what the URL would hold', () => {
    expect(sameTaskQuery(query(), query({ orderDirection: 'desc' }))).toBe(true);
    expect(sameTaskQuery(query(), query({ status: 'active' }))).toBe(false);
  });
});

describe('toTaskListFilter', () => {
  const today = '2026-11-28';

  it('sends nothing for the default query', () => {
    expect(toTaskListFilter(DEFAULT_TASK_QUERY, today)).toEqual({});
  });

  it.each([
    ['today', { dueFrom: '2026-11-28', dueTo: '2026-11-28' }],
    // Crosses into December.
    ['next7', { dueFrom: '2026-11-28', dueTo: '2026-12-04' }],
    ['overdue', { overdue: true }],
    ['none', { hasDueDate: false }],
  ] as const)('resolves the %s due preset against today', (due, expected) => {
    expect(toTaskListFilter(query({ due }), today)).toEqual(expected);
  });

  it('sends a custom range only when it is valid', () => {
    const range = query({ due: 'custom', dueFrom: '2026-11-01', dueTo: '2026-11-30' });
    expect(toTaskListFilter(range, today)).toEqual({ dueFrom: '2026-11-01', dueTo: '2026-11-30' });

    const backwards = query({ due: 'custom', dueFrom: '2026-11-30', dueTo: '2026-11-01' });
    expect(hasInvalidRange(backwards)).toBe(true);
    expect(toTaskListFilter(backwards, today)).toEqual({});
  });

  it('sends the remaining filters and the sort', () => {
    expect(
      toTaskListFilter(
        query({
          priorities: ['high'],
          labelIds: [4, 9],
          labelMatch: 'all',
          recurring: true,
          status: 'active',
          orderBy: 'priority',
          orderDirection: 'desc',
        }),
        today,
      ),
    ).toEqual({
      priorities: ['high'],
      labelIds: [4, 9],
      labelMatch: 'all',
      recurring: true,
      status: 'active',
      orderBy: 'priority',
      orderDirection: 'desc',
    });
  });
});
