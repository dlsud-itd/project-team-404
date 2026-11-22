export type SearchType = 'all' | 'tasks' | 'projects';

export type SearchQuery = {
  q: string;
  type: SearchType;
  limit: number;
  includeArchived: boolean;
};

export type SearchTaskItem = {
  id: number;
  title: string;
  projectId: number | null;
  matchedField: 'title' | 'description';
  snippet: string;
  isArchived: boolean;
  archivedAt: Date | null;
};

export type SearchProjectItem = {
  id: number;
  name: string;
  matchedField: 'name' | 'description';
  snippet: string;
  isArchived: boolean;
  archivedAt: Date | null;
};

export type SearchTaskRecord = SearchTaskItem & {
  updatedAt: Date;
};

export type SearchProjectRecord = SearchProjectItem & {
  updatedAt: Date;
};

export type SearchPage<T> = {
  items: T[];
  total: number;
};

export type SearchResponse = {
  tasks: SearchPage<SearchTaskItem>;
  projects: SearchPage<SearchProjectItem>;
};
