import type { ArchiveCursor, ArchiveItemType } from '../types/archive.types';

const archiveItemTypes: ArchiveItemType[] = ['tasks', 'projects', 'labels'];
const archiveItemTypeRank: Record<ArchiveItemType, number> = {
  tasks: 0,
  projects: 1,
  labels: 2,
};

export function encodeArchiveCursor(cursor: ArchiveCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeArchiveCursor(value: string): ArchiveCursor | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 512) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    !('id' in parsed) ||
    !('archivedAt' in parsed) ||
    typeof parsed.type !== 'string' ||
    !archiveItemTypes.includes(parsed.type as ArchiveItemType) ||
    typeof parsed.id !== 'number' ||
    !Number.isSafeInteger(parsed.id) ||
    parsed.id < 1 ||
    typeof parsed.archivedAt !== 'string'
  ) {
    return null;
  }

  const date = new Date(parsed.archivedAt);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString() !== parsed.archivedAt
  ) {
    return null;
  }

  return {
    type: parsed.type as ArchiveItemType,
    id: parsed.id,
    archivedAt: parsed.archivedAt,
  };
}

export function buildArchiveCursorConditions(
  type: ArchiveItemType,
  cursor: ArchiveCursor
) {
  const conditions: Array<
    | { archivedAt: { lt: Date } }
    | { archivedAt: Date }
    | { archivedAt: Date; id: { lt: number } }
  > = [{ archivedAt: { lt: new Date(cursor.archivedAt) } }];
  const typeRank = archiveItemTypeRank[type];
  const cursorTypeRank = archiveItemTypeRank[cursor.type];

  if (typeRank > cursorTypeRank) {
    conditions.push({ archivedAt: new Date(cursor.archivedAt) });
  } else if (typeRank === cursorTypeRank) {
    conditions.push({
      archivedAt: new Date(cursor.archivedAt),
      id: { lt: cursor.id },
    });
  }

  return conditions;
}

export function compareArchiveEntries(
  left: { type: ArchiveItemType; id: number; archivedAt: Date },
  right: { type: ArchiveItemType; id: number; archivedAt: Date }
) {
  const dateDifference = right.archivedAt.getTime() - left.archivedAt.getTime();
  if (dateDifference !== 0) {
    return dateDifference;
  }
  const typeDifference =
    archiveItemTypeRank[left.type] - archiveItemTypeRank[right.type];
  return typeDifference !== 0 ? typeDifference : right.id - left.id;
}
