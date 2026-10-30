import { describe, expect, it } from 'vitest';
import { updateTaskValidator } from './update-task.validator';

describe('updateTaskValidator', () => {
  it('accepts partial updates', () => {
    expect(updateTaskValidator.parse({ title: 'Revised title' })).toEqual({
      title: 'Revised title',
    });
  });

  it('accepts a project move', () => {
    expect(updateTaskValidator.parse({ projectId: 8 })).toEqual({
      projectId: 8,
    });
  });

  it('rejects empty updates, blank titles, and over-long titles', () => {
    expect(() => updateTaskValidator.parse({})).toThrow();
    expect(() => updateTaskValidator.parse({ title: '' })).toThrow();
    expect(() =>
      updateTaskValidator.parse({ title: 'x'.repeat(201) })
    ).toThrow();
  });

  it('rejects unknown properties', () => {
    expect(() =>
      updateTaskValidator.parse({ title: 'Valid', extra: true })
    ).toThrow();
  });
});
