import type {
  ReorderPayload,
  ReorderableGroup,
  SplitProjects,
} from '../types/project-organization.types';

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** Returns a copy of `list` with the item at `from` moved to `to`. Indexes are clamped. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const result = [...list];
  if (!result.length) return result;
  const last = result.length - 1;
  const [item] = result.splice(clamp(from, last), 1);
  result.splice(clamp(to, last), 0, item);
  return result;
}

/**
 * Moves a project within its group and returns the full new order: favorites, then the rest,
 * then archived, without the Inbox. Sending every id keeps the groups apart on the server.
 * Returns null when nothing moves.
 */
export function reorderPayload(
  split: SplitProjects,
  group: ReorderableGroup,
  from: number,
  to: number,
): ReorderPayload | null {
  const last = split[group].length - 1;
  if (last < 0 || clamp(from, last) === clamp(to, last)) return null;

  const moved = { ...split, [group]: moveItem(split[group], from, to) };
  const projectIds = [...moved.favorites, ...moved.active, ...moved.archived].map(
    (p) => p.projectId,
  );
  return {
    request: { projectIds },
    sortOrders: projectIds.map((projectId, sortOrder) => ({ projectId, sortOrder })),
  };
}
