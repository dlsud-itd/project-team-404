import type { BoardFilter } from '../../board-view/types/task-board.types';

/** One task as a bar, as GET /api/tasks/timeline sends it. Dates are YYYY-MM-DD, inclusive. */
export interface ApiTimelineBar {
  id: number;
  title: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  /** The scheduled date, or the due date when there is none. */
  start: string;
  /** The deadline's date, or the due date, or `start`; never before `start`. */
  end: string;
  isDone: boolean;
  isOverdue: boolean;
  /** The priority level's name in lower case, e.g. "high". */
  priority: string;
}

/** One project's bars. */
export interface ApiTimelineGroup {
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  bars: ApiTimelineBar[];
}

/** Body of GET /api/tasks/timeline. */
export interface ApiTimeline {
  from: string;
  to: string;
  projects: ApiTimelineGroup[];
  /** Matching tasks with no scheduled or due date, which have no place on the timeline. */
  undatedCount: number;
}

/** How much time the timeline shows at once. */
export type TimelineZoom = 'week' | 'month';

/** The dates on screen, YYYY-MM-DD and inclusive. */
export interface TimelineWindow {
  from: string;
  to: string;
}

/** The Sprint 5 filters, which the timeline accepts like the board does. */
export type TimelineFilter = BoardFilter;

/** What to ask the timeline for, besides the window. */
export interface TimelineRequest {
  /** Null for every project. */
  projectId: number | null;
  includeCompleted: boolean;
  filter: TimelineFilter;
}
