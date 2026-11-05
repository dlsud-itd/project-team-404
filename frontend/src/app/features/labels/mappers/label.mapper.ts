import type { ApiLabel, Label } from '../types/label.types';

/** Renames `id` to `labelId`, drops timestamps, and treats a blank color as none. */
export function toLabel({ id, name, color }: ApiLabel): Label {
  return { labelId: id, name, color: color?.trim() || null };
}
