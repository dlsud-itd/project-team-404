/** What can be archived. */
export type ArchiveKind = 'task' | 'project' | 'label' | 'priority';

/** The tabs of the Archive page; also the `type` filter of GET /api/archive. */
export type ArchiveTab = 'all' | 'tasks' | 'projects' | 'labels' | 'priorities';

export const ARCHIVE_TABS: readonly ArchiveTab[] = [
  'all',
  'tasks',
  'projects',
  'labels',
  'priorities',
];

/** One row of the Archive page. */
export interface ArchiveItem {
  kind: ArchiveKind;
  id: number;
  name: string;
  /** ISO instant the item was archived. */
  archivedAt: string;
  /** Tasks: the project the task belongs to. */
  projectId?: number | null;
  projectName?: string | null;
  /** Projects and labels: hex color, or null for none. Tasks: their project's color. */
  color?: string | null;
  /** Labels and priorities: how many tasks still use it. */
  taskCount?: number | null;
}

export interface ArchiveCounts {
  all: number;
  tasks: number;
  projects: number;
  labels: number;
  priorities: number;
}

/** One page of GET /api/archive, flattened into a single list. */
export interface ArchivePage {
  items: ArchiveItem[];
  counts: ArchiveCounts;
  /** Pass back to get the next page; null when there are no more. */
  nextCursor: string | null;
}

/** Something to archive or restore, as the archive actions see it. */
export interface ArchiveTarget {
  kind: ArchiveKind;
  id: number;
  name: string;
}

/** A task inside GET /api/archive; only the fields the page uses. */
export interface ApiArchivedTask {
  id: number;
  title: string;
  projectId: number | null;
  archivedAt: string | null;
}

export interface ApiArchivedProject {
  id: number;
  name: string;
  color: string | null;
  isInbox?: boolean;
  archivedAt: string | null;
}

export interface ApiArchivedLabel {
  id: number;
  name: string;
  color: string | null;
  taskCount?: number;
  archivedAt: string | null;
}

export interface ApiArchivedPriority {
  id: number;
  name: string;
  color: string | null;
  taskCount?: number;
  archivedAt: string | null;
}

interface ApiArchiveGroup<T> {
  items: T[];
  total: number;
}

/** Body of GET /api/archive. */
export interface ApiArchiveResponse {
  tasks: ApiArchiveGroup<ApiArchivedTask>;
  projects: ApiArchiveGroup<ApiArchivedProject>;
  labels: ApiArchiveGroup<ApiArchivedLabel>;
  /** Missing from servers older than priority archiving. */
  priorities?: ApiArchiveGroup<ApiArchivedPriority>;
  nextCursor: string | null;
}
