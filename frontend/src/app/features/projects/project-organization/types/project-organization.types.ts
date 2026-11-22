import type { Project } from '../../shared/types/project.types';

/** Response of PUT /api/projects/{projectId}/favorite. */
export interface SetFavoriteResponse {
  projectId: number;
  isFavorite: boolean;
  message: string;
}

/** Response of PUT /api/projects/{projectId}/archive. */
export interface SetArchivedResponse {
  projectId: number;
  isArchived: boolean;
  message: string;
}

export interface ProjectSortOrder {
  projectId: number;
  sortOrder: number;
}

/** Body of PUT /api/projects/reorder: every non-Inbox project id, in the new order. */
export interface ReorderProjectsRequest {
  projectIds: number[];
}

export interface ReorderProjectsResponse {
  projects: ProjectSortOrder[];
  message: string;
}

/** A project list split into the groups the switcher shows. */
export interface SplitProjects {
  inbox: Project | null;
  favorites: Project[];
  active: Project[];
  archived: Project[];
}

/** The groups whose order the user can change. */
export type ReorderableGroup = 'favorites' | 'active';

/** A new order, ready to send to the server and to show straight away. */
export interface ReorderPayload {
  request: ReorderProjectsRequest;
  sortOrders: ProjectSortOrder[];
}
