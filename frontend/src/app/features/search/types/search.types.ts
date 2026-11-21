/** The `type` filter of GET /api/search; also the tabs of the search page. */
export type SearchType = 'all' | 'tasks' | 'projects';

export const SEARCH_TYPES: readonly SearchType[] = ['all', 'tasks', 'projects'];

/** A task inside GET /api/search. */
export interface ApiSearchTask {
  id: number;
  title: string;
  projectId: number | null;
  matchedField: 'title' | 'description';
  snippet: string;
  isArchived: boolean;
  archivedAt: string | null;
}

/** A project inside GET /api/search. */
export interface ApiSearchProject {
  id: number;
  name: string;
  matchedField: 'name' | 'description';
  snippet: string;
  isArchived: boolean;
  archivedAt: string | null;
}

interface ApiSearchGroup<T> {
  items: T[];
  total: number;
}

/** Body of GET /api/search. */
export interface ApiSearchResponse {
  tasks: ApiSearchGroup<ApiSearchTask>;
  projects: ApiSearchGroup<ApiSearchProject>;
}

export interface SearchOptions {
  type?: SearchType;
  limit?: number;
  includeArchived?: boolean;
}

/** One search, as the server answered it. */
export interface SearchResults {
  query: string;
  tasks: ApiSearchTask[];
  projects: ApiSearchProject[];
  /** Matches on the server, which can be more than the items returned. */
  counts: { tasks: number; projects: number };
}

/** A task row, with what the app's stores know about it. */
export interface SearchTaskResult {
  kind: 'task';
  id: number;
  title: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  /** Only known when the task is already loaded in TasksStore. */
  priorityName: string | null;
  priorityColor: string | null;
  /** YYYY-MM-DD; only known when the task is already loaded in TasksStore. */
  dueDate: string | null;
  /** The match came from the description; `snippet` holds the text around it. */
  inDescription: boolean;
  snippet: string;
  isArchived: boolean;
}

/** A project row. */
export interface SearchProjectResult {
  kind: 'project';
  id: number;
  name: string;
  color: string | null;
  inDescription: boolean;
  snippet: string;
  isArchived: boolean;
}

export type SearchResult = SearchTaskResult | SearchProjectResult;

/** What a search box or page is showing. */
export type SearchState = 'idle' | 'loading' | 'error' | 'done';
