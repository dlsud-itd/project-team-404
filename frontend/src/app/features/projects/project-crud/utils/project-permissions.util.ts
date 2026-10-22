import type { Project } from '../../shared/types/project.types';

export interface ProjectPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/** The Inbox is created at sign-up and is read-only: it cannot be edited or deleted. */
export function isReadOnlyProject(project: Pick<Project, 'isInbox'>): boolean {
  return project.isInbox;
}

export function projectPermissions(project: Pick<Project, 'isInbox'>): ProjectPermissions {
  const readOnly = isReadOnlyProject(project);
  return { canEdit: !readOnly, canDelete: !readOnly };
}
