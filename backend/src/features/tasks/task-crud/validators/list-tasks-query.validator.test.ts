import { describe, expect, it } from 'vitest';
import { listTasksQueryValidator } from './list-tasks-query.validator';

describe('listTasksQueryValidator', () => {
  it('applies all-status and paging defaults', () => {
    expect(listTasksQueryValidator.parse({})).toEqual({
      status: 'all',
      page: 1,
      pageSize: 20,
      orderDirection: 'asc',
    });
  });

  it('coerces project and pagination values', () => {
    expect(
      listTasksQueryValidator.parse({
        projectId: '4',
        page: '2',
        pageSize: '10',
        status: 'completed',
      })
    ).toEqual({
      projectId: 4,
      page: 2,
      pageSize: 10,
      status: 'completed',
      orderDirection: 'asc',
    });
  });

  it('rejects invalid status, page, and page size', () => {
    expect(() =>
      listTasksQueryValidator.parse({ status: 'deleted' })
    ).toThrow();
    expect(() => listTasksQueryValidator.parse({ page: '0' })).toThrow();
    expect(() => listTasksQueryValidator.parse({ pageSize: '101' })).toThrow();
  });

  it('rejects conflicts with legacy completion and overdue filters', () => {
    expect(() =>
      listTasksQueryValidator.parse({ status: 'active', isDone: 'false' })
    ).toThrow();
    expect(() =>
      listTasksQueryValidator.parse({ overdue: 'true', status: 'completed' })
    ).toThrow();
    expect(() =>
      listTasksQueryValidator.parse({ overdue: 'true', isDone: 'true' })
    ).toThrow();
  });

  it('rejects unsupported query parameters', () => {
    expect(() =>
      listTasksQueryValidator.parse({ unexpected: 'value' })
    ).toThrow();
  });
});
