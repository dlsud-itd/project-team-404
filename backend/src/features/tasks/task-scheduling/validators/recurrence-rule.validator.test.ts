import { describe, expect, it } from 'vitest';
import { createTaskValidator } from '../../task-crud/validators/create-task.validator';
import { recurrenceRuleValidator } from './recurrence-rule.validator';

describe('recurrenceRuleValidator', () => {
  it('accepts a weekly repeat on chosen days, sorted and without repeats', () => {
    expect(
      recurrenceRuleValidator.parse({
        recurrence: 'weekly',
        recurrenceDays: [5, 1, 3, 1],
        recurrenceEndDate: '2026-12-31',
      })
    ).toEqual({
      recurrence: 'weekly',
      recurrenceDays: [1, 3, 5],
      recurrenceEndDate: '2026-12-31',
    });
  });

  it('accepts a repeat that never ends', () => {
    expect(
      recurrenceRuleValidator.parse({
        recurrence: 'daily',
        recurrenceEndDate: null,
      })
    ).toEqual({ recurrence: 'daily', recurrenceEndDate: null });
  });

  it('rejects days outside Sunday (0) to Saturday (6)', () => {
    expect(() =>
      recurrenceRuleValidator.parse({
        recurrence: 'weekly',
        recurrenceDays: [7],
      })
    ).toThrow();
    expect(() =>
      recurrenceRuleValidator.parse({
        recurrence: 'weekly',
        recurrenceDays: [-1],
      })
    ).toThrow();
  });

  it('rejects days without a weekly repeat', () => {
    expect(() =>
      recurrenceRuleValidator.parse({
        recurrence: 'daily',
        recurrenceDays: [1],
      })
    ).toThrow(/weekly/);
    expect(() =>
      recurrenceRuleValidator.parse({ recurrenceDays: [1] })
    ).toThrow();
  });

  it('rejects an end date on a task that does not repeat', () => {
    expect(() =>
      recurrenceRuleValidator.parse({
        recurrence: 'none',
        recurrenceEndDate: '2026-12-31',
      })
    ).toThrow(/recurrence end date/);
  });

  it('rejects a malformed end date', () => {
    expect(() =>
      recurrenceRuleValidator.parse({
        recurrence: 'weekly',
        recurrenceEndDate: '12/31/2026',
      })
    ).toThrow();
  });
});

describe('createTaskValidator recurrence rule', () => {
  it('rejects an end date before the due date', () => {
    expect(() =>
      createTaskValidator.parse({
        title: 'Gym',
        dueDate: '2026-11-10',
        recurrence: 'weekly',
        recurrenceDays: [1],
        recurrenceEndDate: '2026-11-09',
      })
    ).toThrow(/before the due date/);
  });

  it('accepts an end date on the due date', () => {
    expect(
      createTaskValidator.parse({
        title: 'Gym',
        dueDate: '2026-11-10',
        recurrence: 'weekly',
        recurrenceDays: [2],
        recurrenceEndDate: '2026-11-10',
      })
    ).toMatchObject({ recurrenceDays: [2], recurrenceEndDate: '2026-11-10' });
  });
});
