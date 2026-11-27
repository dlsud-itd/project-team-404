import type { Project } from '../../projects/shared/types/project.types';
import type { DashboardProjectSort } from '../../settings/types/user-settings.types';

const byCustomOrder = (a: Project, b: Project) =>
  a.sortOrder - b.sortOrder || a.projectId - b.projectId;

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * The dashboard's favorite projects in the chosen order. "Custom" is the drag order from the
 * Projects page. Projects never opened sort after the ones that were, under "Recently accessed".
 */
export function sortDashboardProjects(
  projects: readonly Project[],
  sort: DashboardProjectSort,
): Project[] {
  const list = [...projects];
  switch (sort) {
    case 'name-asc':
      return list.sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || byCustomOrder(a, b),
      );
    case 'name-desc':
      return list.sort(
        (a, b) =>
          b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }) || byCustomOrder(a, b),
      );
    case 'recent':
      return list.sort(
        (a, b) => time(b.lastAccessedAt) - time(a.lastAccessedAt) || byCustomOrder(a, b),
      );
    case 'created-desc':
      return list.sort(
        (a, b) => time(b.createdAt) - time(a.createdAt) || b.projectId - a.projectId,
      );
    case 'created-asc':
      return list.sort(
        (a, b) => time(a.createdAt) - time(b.createdAt) || a.projectId - b.projectId,
      );
    default:
      return list.sort(byCustomOrder);
  }
}
