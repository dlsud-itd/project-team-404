/** A project as the app uses it. ProjectService converts the API's `id` to `projectId`. */
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

/**
 * A project exactly as the backend sends it: the id is called `id`, and timestamps are
 * included. ProjectService turns it into a Project before anything else sees it.
 */
export interface ApiProject extends Omit<Project, 'projectId'> {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Body of POST /api/projects. Optional fields are sent as null, never as empty strings. */
export interface CreateProjectRequest {
  name: string;
  description: string | null;
  color: string | null;
}

/** Body of PATCH /api/projects/{projectId}: only the fields that changed. */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface DeleteProjectResponse {
  /** Tasks moved to the Inbox. The API answers 204 with no body today, so this is 0 then. */
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
