import { describe, expect, it } from 'vitest';
import {
  buildArchiveCursorConditions,
  compareArchiveEntries,
  decodeArchiveCursor,
  encodeArchiveCursor,
} from './archive-cursor';

describe('archive cursor utilities', () => {
  it('round-trips an opaque cursor and rejects malformed values', () => {
    const cursor = {
      type: 'projects' as const,
      id: 12,
      archivedAt: '2026-11-10T09:30:00.000Z',
    };
    const encoded = encodeArchiveCursor(cursor);

    expect(decodeArchiveCursor(encoded)).toEqual(cursor);
    expect(decodeArchiveCursor('not-a-cursor')).toBeNull();
    expect(
      decodeArchiveCursor(
        Buffer.from(
          JSON.stringify({ ...cursor, archivedAt: 'yesterday' })
        ).toString('base64url')
      )
    ).toBeNull();
  });

  it('uses timestamp, type, and descending ID as the stable page order', () => {
    const archivedAt = new Date('2026-11-10T09:30:00.000Z');
    const entries = [
      { type: 'labels' as const, id: 1, archivedAt },
      { type: 'tasks' as const, id: 1, archivedAt },
      { type: 'tasks' as const, id: 3, archivedAt },
      {
        type: 'projects' as const,
        id: 2,
        archivedAt: new Date('2026-11-09T09:30:00.000Z'),
      },
    ];

    expect(entries.sort(compareArchiveEntries)).toEqual([
      { type: 'tasks', id: 3, archivedAt },
      { type: 'tasks', id: 1, archivedAt },
      { type: 'labels', id: 1, archivedAt },
      {
        type: 'projects',
        id: 2,
        archivedAt: new Date('2026-11-09T09:30:00.000Z'),
      },
    ]);
    expect(
      buildArchiveCursorConditions('labels', {
        type: 'tasks',
        id: 3,
        archivedAt: archivedAt.toISOString(),
      })
    ).toEqual([{ archivedAt: { lt: archivedAt } }, { archivedAt }]);
  });
});
