import type { ParamMap, Params } from '@angular/router';
import type { Project } from '../../shared/types/project.types';

export type ProjectSortField = 'sortOrder' | 'name' | 'createdAt' | 'updatedAt';

/** What the project list is filtered and sorted by. It lives in the URL. */
export interface ProjectQuery {
  favorites: boolean;
  /** Show archived projects instead of active ones. */
  archived: boolean;
  /** #RRGGBB in upper case, or null for any color. */
  color: string | null;
  /** 'sortOrder' is the user's own (custom) order. */
  orderBy: ProjectSortField;
  orderDirection: 'asc' | 'desc';
}

export const DEFAULT_PROJECT_QUERY: Readonly<ProjectQuery> = {
  favorites: false,
  archived: false,
  color: null,
  orderBy: 'sortOrder',
  orderDirection: 'asc',
};

const SORT_FIELDS: readonly ProjectSortField[] = ['sortOrder', 'name', 'createdAt', 'updatedAt'];

/**
 * Reads the query from the URL, ignoring anything malformed. The keys are short and distinct
 * from the home page's own `tab` and `view`, which share the URL.
 */
export function projectQueryFromParams(params: ParamMap): ProjectQuery {
  const color = params.get('color');
  const orderBy = SORT_FIELDS.find((field) => field === params.get('sort')) ?? 'sortOrder';
  return {
    favorites: params.get('favorites') === 'true',
    archived: params.get('archived') === 'true',
    color: color && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null,
    orderBy,
    orderDirection: orderBy !== 'sortOrder' && params.get('dir') === 'desc' ? 'desc' : 'asc',
  };
}

/** URL params for a query; defaults are null so a merge navigation removes them. */
export function projectQueryToParams(query: ProjectQuery): Params {
  const sorted = query.orderBy !== 'sortOrder';
  return {
    favorites: query.favorites ? 'true' : null,
    archived: query.archived ? 'true' : null,
    color: query.color,
    sort: sorted ? query.orderBy : null,
    dir: sorted && query.orderDirection === 'desc' ? 'desc' : null,
  };
}

export function activeProjectFilterCount(query: ProjectQuery): number {
  return [query.favorites, query.archived, query.color !== null].filter(Boolean).length;
}

/** The colors in use among these projects, for the color filter, in upper case. */
export function projectColors(projects: readonly Project[]): string[] {
  return [...new Set(projects.flatMap((p) => (p.color ? [p.color.toUpperCase()] : [])))].sort();
}

/**
 * The projects a query shows, Inbox excluded: active or archived ones, narrowed by favorite and
 * color, then sorted. Missing dates sort last in either direction, as the API does; ties fall
 * back to the custom order and then the id, so the order never jumps.
 */
export function applyProjectQuery(projects: readonly Project[], query: ProjectQuery): Project[] {
  const direction = query.orderDirection === 'desc' ? -1 : 1;
  return projects
    .filter(
      (p) =>
        !p.isInbox &&
        p.isArchived === query.archived &&
        (!query.favorites || p.isFavorite) &&
        (query.color === null || p.color?.toUpperCase() === query.color),
    )
    .sort(
      (a, b) =>
        compareBy(a, b, query.orderBy, direction) ||
        a.sortOrder - b.sortOrder ||
        a.projectId - b.projectId,
    );
}

function compareBy(a: Project, b: Project, field: ProjectSortField, direction: number): number {
  switch (field) {
    case 'sortOrder':
      return direction * (a.sortOrder - b.sortOrder);
    case 'name':
      return direction * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    case 'createdAt':
    case 'updatedAt': {
      const left = a[field];
      const right = b[field];
      if (!left || !right) return left ? -1 : right ? 1 : 0;
      return direction * (left < right ? -1 : left > right ? 1 : 0);
    }
  }
}
