import { describe, expect, it } from 'vitest';
import { createTaskValidator } from './create-task.validator';

describe('createTaskValidator', () => {
  it('accepts a task with title, description, and project', () => {
    expect(
      createTaskValidator.parse({
        title: 'Review sprint plan',
        description: 'Check the milestones',
        projectId: 5,
      })
    ).toMatchObject({ title: 'Review sprint plan', projectId: 5 });
  });

  it('rejects empty and over-long titles', () => {
    expect(() => createTaskValidator.parse({ title: '   ' })).toThrow();
    expect(() =>
      createTaskValidator.parse({ title: 'x'.repeat(201) })
    ).toThrow();
  });

  it('rejects invalid fields and unknown properties', () => {
    expect(() =>
      createTaskValidator.parse({ title: 'Valid', projectId: -1 })
    ).toThrow();
    expect(() =>
      createTaskValidator.parse({ title: 'Valid', unknown: true })
    ).toThrow();
  });

  it('accepts an end date on or after the start date', () => {
    expect(
      createTaskValidator.parse({
        title: 'Valid',
        scheduledDate: '2026-11-20',
        dueDate: '2026-11-20',
      })
    ).toMatchObject({ scheduledDate: '2026-11-20', dueDate: '2026-11-20' });
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      createTaskValidator.parse({
        title: 'Valid',
        scheduledDate: '2026-11-20',
        dueDate: '2026-11-19',
      })
    ).toThrow('End date cannot be before the start date');
  });

  it('no longer accepts a deadline', () => {
    expect(() =>
      createTaskValidator.parse({
        title: 'Valid',
        deadline: '2026-11-20T15:59:59.999Z',
      })
    ).toThrow();
  });
});
