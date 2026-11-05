import type { ApiLabel, Label } from '../../types/label.types';

/** The response body the backend would send for `label`, for flushing in specs. */
export function apiLabel({ labelId, ...rest }: Label): ApiLabel {
  return {
    id: labelId,
    ...rest,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

export const STUDY: Label = { labelId: 3, name: 'Study', color: '#2563EB' };
export const ERRANDS: Label = { labelId: 5, name: 'errands', color: null };
export const URGENT: Label = { labelId: 7, name: 'Urgent', color: '#DC2626' };
