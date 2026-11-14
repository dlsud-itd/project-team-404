import { describe, expect, it } from 'vitest';
import { encodeArchiveCursor } from '../utils/archive-cursor';
import { archiveQueryValidator } from './archive-query.validator';

describe('archiveQueryValidator', () => {
  it('applies defaults and parses a valid cursor', () => {
    const cursor = {
      type: 'tasks' as const,
      id: 7,
      archivedAt: '2026-11-10T09:30:00.000Z',
    };

    expect(
      archiveQueryValidator.parse({ cursor: encodeArchiveCursor(cursor) })
    ).toEqual({
      type: 'all',
      limit: 20,
      cursor,
    });
  });

  it.each([
    { type: 'unknown' },
    { limit: '0' },
    { limit: '51' },
    { limit: '1.5' },
    { cursor: 'invalid' },
    { unexpected: 'value' },
  ])('rejects invalid archive query %j', (query) => {
    expect(archiveQueryValidator.safeParse(query).success).toBe(false);
  });
});
