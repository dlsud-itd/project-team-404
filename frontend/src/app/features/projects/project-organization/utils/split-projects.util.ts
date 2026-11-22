import type { Project } from '../../shared/types/project.types';
import type { SplitProjects } from '../types/project-organization.types';

/**
 * Splits projects into Inbox, favorites, the rest, and archived, keeping their order.
 * An archived favorite counts as archived.
 */
export function splitProjects(projects: readonly Project[]): SplitProjects {
  const split: SplitProjects = { inbox: null, favorites: [], active: [], archived: [] };
  for (const project of projects) {
    if (project.isInbox) split.inbox ??= project;
    else if (project.isArchived) split.archived.push(project);
    else if (project.isFavorite) split.favorites.push(project);
    else split.active.push(project);
  }
  return split;
}
