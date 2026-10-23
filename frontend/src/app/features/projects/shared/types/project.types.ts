/** A project as returned by /api/projects (API spec v1.1, section II). */
export interface Project {
  projectId: number;
  name: string;
  description: string | null;
  /** Hex color such as #2563EB, or null for none. */
  color: string | null;
  /** True for the user's Inbox, which the user cannot edit or delete. */
  isInbox: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  sortOrder: number;
}

/** Body of POST /api/projects. Optional fields are sent as null, never as empty strings. */
export interface CreateProjectRequest {
  name: string;
  description: string | null;
  color: string | null;
}

/** Body of PUT /api/projects/{projectId}: only the fields that changed. */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface UpdateProjectResponse {
  projectId: number;
  message: string;
}

export interface DeleteProjectResponse {
  message: string;
  movedTaskCount: number;
}

export type ProjectField = 'name' | 'description' | 'color';

/** A failed project request, turned into something a page can show. */
export interface ProjectError {
  message: string;
  /** The form field the server rejected, when it can be told from the message. */
  field?: ProjectField;
  /** The project no longer exists or belongs to someone else. */
  notFound: boolean;
}

export const PROJECT_NAME_MAX_LENGTH = 150;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
