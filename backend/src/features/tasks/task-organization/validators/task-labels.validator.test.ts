import { describe, expect, it } from 'vitest';
import {
  taskLabelIdValidator,
  taskLabelsValidator,
} from './task-labels.validator';

describe('taskLabelsValidator', () => {
  it('accepts one or more positive label IDs', () => {
    expect(taskLabelsValidator.parse({ labelIds: [2, 4] })).toEqual({
      labelIds: [2, 4],
    });
  });

  it('rejects empty or invalid label ID arrays', () => {
    expect(() => taskLabelsValidator.parse({ labelIds: [] })).toThrow();
    expect(() => taskLabelsValidator.parse({ labelIds: [0] })).toThrow();
  });
});

describe('taskLabelIdValidator', () => {
  it('coerces positive IDs and rejects invalid IDs', () => {
    expect(taskLabelIdValidator.parse('2')).toBe(2);
    expect(() => taskLabelIdValidator.parse('0')).toThrow();
  });
});
