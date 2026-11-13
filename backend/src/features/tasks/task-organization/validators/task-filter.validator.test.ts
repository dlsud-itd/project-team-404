import { describe, expect, it } from 'vitest';
import { taskFilterValidator } from './task-filter.validator';

describe('taskFilterValidator', () => {
  it('keeps the legacy single priority and label filters', () => {
    expect(
      taskFilterValidator.parse({ priority: 'MEDIUM', labelId: '7' })
    ).toEqual({ priority: 'medium', labelId: 7 });
  });

  it('parses case-insensitive priorities and comma-separated label IDs', () => {
    expect(
      taskFilterValidator.parse({
        priorities: 'HIGH, low,high',
        labelIds: '7, 9,7',
        labelMatch: 'all',
      })
    ).toEqual({
      priorities: ['high', 'low'],
      labelIds: [7, 9],
      labelMatch: 'all',
    });
  });

  it('parses date, due-date, recurring, and completion filters', () => {
    expect(
      taskFilterValidator.parse({
        dueFrom: '2026-11-10',
        dueTo: '2026-11-30',
        hasDueDate: 'true',
        overdue: 'true',
        recurring: 'false',
        isDone: 'false',
      })
    ).toEqual({
      dueFrom: '2026-11-10',
      dueTo: '2026-11-30',
      hasDueDate: true,
      overdue: true,
      recurring: false,
      isDone: false,
    });
  });

  it.each([
    ['priority', { priority: 'urgent' }],
    ['priorities', { priorities: 'low,urgent' }],
    ['priorities empty member', { priorities: 'low,,high' }],
    ['label ID', { labelId: '0' }],
    ['label IDs', { labelIds: '1,invalid' }],
    ['label match', { labelMatch: 'every' }],
    ['date format', { dueFrom: '11-10-2026' }],
    ['invalid calendar date', { dueTo: '2026-02-30' }],
    ['has due date', { hasDueDate: 'yes' }],
    ['overdue', { overdue: 'false' }],
    ['recurring', { recurring: 'yes' }],
    ['is done', { isDone: 'yes' }],
  ])('rejects invalid %s values', (_name, query) => {
    expect(taskFilterValidator.safeParse(query).success).toBe(false);
  });

  it('rejects conflicting filters and reversed date ranges', () => {
    expect(
      taskFilterValidator.safeParse({
        priority: 'low',
        priorities: 'low,high',
      }).success
    ).toBe(false);
    expect(
      taskFilterValidator.safeParse({ labelId: '1', labelIds: '1,2' }).success
    ).toBe(false);
    expect(
      taskFilterValidator.safeParse({
        dueFrom: '2026-11-30',
        dueTo: '2026-11-10',
      }).success
    ).toBe(false);
    expect(taskFilterValidator.safeParse({ unexpected: 'value' }).success).toBe(
      false
    );
  });
});
