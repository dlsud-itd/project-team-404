import type { TaskPriority } from '../types/task-organization.types';
import {
  NO_PRIORITY_COLORS,
  PRIORITY_OPTIONS,
  comparePriority,
  isTaskPriority,
  priorityColors,
  priorityLabel,
  priorityRank,
  sortByPriority,
} from './priority.util';

describe('priority.util', () => {
  it('lists the three priorities, most urgent first', () => {
    expect(PRIORITY_OPTIONS.map((o) => o.value)).toEqual(['high', 'medium', 'low']);
    expect(PRIORITY_OPTIONS.map((o) => o.rank)).toEqual([1, 2, 3]);
  });

  it('gives each priority its own colors', () => {
    const borders = new Set(PRIORITY_OPTIONS.map((o) => o.colors.border));
    expect(borders.size).toBe(3);
    for (const { colors } of PRIORITY_OPTIONS) {
      for (const value of Object.values(colors)) expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  describe('isTaskPriority', () => {
    it('accepts the API values only', () => {
      expect(isTaskPriority('high')).toBe(true);
      expect(isTaskPriority('medium')).toBe(true);
      expect(isTaskPriority('low')).toBe(true);
      expect(isTaskPriority('HIGH')).toBe(false);
      expect(isTaskPriority('urgent')).toBe(false);
      expect(isTaskPriority(1)).toBe(false);
      expect(isTaskPriority(null)).toBe(false);
      expect(isTaskPriority(undefined)).toBe(false);
    });
  });

  describe('priorityLabel', () => {
    it('names each priority', () => {
      expect(priorityLabel('high')).toBe('High');
      expect(priorityLabel('medium')).toBe('Medium');
      expect(priorityLabel('low')).toBe('Low');
    });

    it('says "No priority" when there is none', () => {
      expect(priorityLabel(null)).toBe('No priority');
      expect(priorityLabel(undefined)).toBe('No priority');
    });
  });

  describe('priorityColors', () => {
    it('returns the colors of a priority', () => {
      expect(priorityColors('high')).toEqual(PRIORITY_OPTIONS[0].colors);
    });

    it('returns neutral colors when there is no priority', () => {
      expect(priorityColors(null)).toBe(NO_PRIORITY_COLORS);
    });
  });

  describe('priorityRank', () => {
    it('ranks high first and no priority last', () => {
      expect(priorityRank('high')).toBe(1);
      expect(priorityRank('medium')).toBe(2);
      expect(priorityRank('low')).toBe(3);
      expect(priorityRank(null)).toBe(4);
    });
  });

  describe('comparePriority', () => {
    it('puts the more urgent priority first by default', () => {
      expect(comparePriority('high', 'low')).toBeLessThan(0);
      expect(comparePriority('low', 'medium')).toBeGreaterThan(0);
      expect(comparePriority('medium', 'medium')).toBe(0);
    });

    it('reverses for descending order', () => {
      expect(comparePriority('high', 'low', 'desc')).toBeGreaterThan(0);
    });

    it('always puts no priority last', () => {
      expect(comparePriority(null, 'low')).toBeGreaterThan(0);
      expect(comparePriority(null, 'low', 'desc')).toBeGreaterThan(0);
      expect(comparePriority('high', undefined, 'desc')).toBeLessThan(0);
      expect(comparePriority(null, undefined)).toBe(0);
    });
  });

  describe('sortByPriority', () => {
    const tasks: { id: number; priority: TaskPriority | null }[] = [
      { id: 1, priority: 'low' },
      { id: 2, priority: null },
      { id: 3, priority: 'high' },
      { id: 4, priority: 'medium' },
      { id: 5, priority: 'high' },
    ];

    it('sorts a copy most urgent first, keeping ties in order', () => {
      const sorted = sortByPriority(tasks, (t) => t.priority);

      expect(sorted.map((t) => t.id)).toEqual([3, 5, 4, 1, 2]);
      expect(tasks.map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('sorts least urgent first when descending, still ending with no priority', () => {
      expect(sortByPriority(tasks, (t) => t.priority, 'desc').map((t) => t.id)).toEqual([
        1, 4, 3, 5, 2,
      ]);
    });
  });
});
