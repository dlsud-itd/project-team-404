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
});
