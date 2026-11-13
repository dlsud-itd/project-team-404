/** One of the user's priority levels, as /api/priorities sends it. */
export interface PriorityLevel {
  id: number;
  name: string;
  /** #RRGGBB, or null for none. */
  color: string | null;
  /** Position in the user's order, lowest first. */
  sortOrder: number;
  /** New tasks get this level when none is chosen. Exactly one level is the default. */
  isDefault: boolean;
  /** Tasks on this level, or null when the server does not say. */
  taskCount: number | null;
}

/** A label as the settings page shows it. */
export interface LabelSetting {
  id: number;
  name: string;
  color: string | null;
  /** Tasks with this label, or null when the server does not say. */
  taskCount: number | null;
  sortOrder: number;
  isArchived: boolean;
  /** ISO instant, or null while active. */
  archivedAt: string | null;
}

/** Name and color, the fields a label or priority level is created or edited with. */
export interface NameAndColor {
  name: string;
  color: string | null;
}

/** Result of DELETE /api/priorities/:id. */
export interface DeletePriorityResult {
  deletedId: number;
  reassignedTo: number | null;
  tasksReassigned: number;
}

/** Most characters a label or priority name may have. */
export const SETTING_NAME_MAX_LENGTH = 50;

/** Shown when a level or label has no color of its own. */
export const NO_COLOR = '#A8A29E';
