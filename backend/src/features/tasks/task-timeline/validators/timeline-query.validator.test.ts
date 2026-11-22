import { describe, expect, it } from 'vitest';
import { timelineQueryValidator } from './timeline-query.validator';

describe('timelineQueryValidator', () => {
  it('defaults completed tasks off and accepts the 92-day inclusive limit', () => {
    const result = timelineQueryValidator.parse({
      from: '2026-01-01',
      to: '2026-04-02',
    });

    expect(result.includeCompleted).toBe(false);
    expect(result.status).toBe('all');
  });

  it('parses timeline and Sprint 5 task filters', () => {
    expect(
      timelineQueryValidator.parse({
        from: '2026-11-01',
        to: '2026-11-30',
        projectId: '4',
        includeCompleted: 'true',
        priorities: 'HIGH,low',
        labelIds: '3,8',
        dueFrom: '2026-11-05',
        hasDueDate: 'true',
        recurring: 'false',
      })
    ).toMatchObject({
      projectId: 4,
      includeCompleted: true,
      priorities: ['high', 'low'],
      labelIds: [3, 8],
      hasDueDate: true,
      recurring: false,
    });
  });

  it.each([
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-11-02', to: '2026-11-01' },
    { from: '2026-01-01', to: '2026-04-03' },
    { from: '2026-01-01', to: '2026-01-02', includeCompleted: 'yes' },
    { from: '2026-01-01', to: '2026-01-02', unexpected: 'x' },
  ])('rejects invalid timeline query $from to $to', (query) => {
    expect(timelineQueryValidator.safeParse(query).success).toBe(false);
  });

  it('retains task-filter combination validation', () => {
    expect(
      timelineQueryValidator.safeParse({
        from: '2026-11-01',
        to: '2026-11-02',
        priority: 'high',
        priorities: 'low',
      }).success
    ).toBe(false);
  });
});
