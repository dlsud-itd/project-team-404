/** A label as the rest of the app sees it. Matches TaskLabel, so a Label can go on a task. */
export interface Label {
  labelId: number;
  name: string;
  /** Hex color such as #2563EB, or null for none. */
  color: string | null;
}

/**
 * A label exactly as /api/labels sends it: the id is called `id`, and timestamps are included.
 * LabelService turns it into a Label before anything else sees it.
 */
export interface ApiLabel {
  id: number;
  name: string;
  color: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Body of POST /api/labels. No color is sent as null, never as an empty string. */
export interface CreateLabelRequest {
  name: string;
  color: string | null;
}

/** Body of PUT /api/labels/{labelId}: only the fields that changed (at least one). */
export type UpdateLabelRequest = Partial<CreateLabelRequest>;

export type LabelField = 'name' | 'color';

/** A failed label request, turned into something a page can show. */
export interface LabelError {
  message: string;
  /** The form field the server rejected, when it can be told from the response. */
  field?: LabelField;
  /** The label no longer exists or belongs to someone else. */
  notFound: boolean;
}

/** The backend's limit (varchar(50)), measured after trimming. */
export const LABEL_NAME_MAX_LENGTH = 50;

/** The colors a user can pick for a label. */
export const LABEL_COLORS: readonly { value: string; label: string }[] = [
  { value: '#DC2626', label: 'Red' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#CA8A04', label: 'Yellow' },
  { value: '#16A34A', label: 'Green' },
  { value: '#0D9488', label: 'Teal' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Violet' },
  { value: '#DB2777', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
];
