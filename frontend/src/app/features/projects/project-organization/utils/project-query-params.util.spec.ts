import { convertToParamMap } from '@angular/router';
import type { Project } from '../../shared/types/project.types';
import {
  DEFAULT_PROJECT_QUERY,
  activeProjectFilterCount,
  applyProjectQuery,
  projectColors,
  projectQueryFromParams,
  projectQueryToParams,
  type ProjectQuery,
} from './project-query-params.util';

const base: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const project = (changes: Partial<Project>): Project => ({ ...base, isInbox: false, ...changes });
const INBOX = base;
const ALPHA = project({
  projectId: 10,
  name: 'alpha',
  color: '#2563eb',
  sortOrder: 2,
  createdAt: '2026-10-03T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
});
const BETA = project({
  projectId: 11,
  name: 'Beta',
  isFavorite: true,
  sortOrder: 1,
  createdAt: '2026-10-01T00:00:00Z',
});
const GAMMA = project({
  projectId: 12,
  name: 'Gamma',
  color: '#D9F2FF',
  isArchived: true,
  sortOrder: 0,
  createdAt: '2026-10-02T00:00:00Z',
});
const ALL = [GAMMA, ALPHA, INBOX, BETA];

const query = (changes: Partial<ProjectQuery> = {}): ProjectQuery => ({
  ...DEFAULT_PROJECT_QUERY,
  ...changes,
});
const names = (projects: Project[]) => projects.map((p) => p.name);

describe('project query params', () => {
  it('round-trips a query through the URL and drops defaults', () => {
    const original = query({
      favorites: true,
      archived: true,
      color: '#D9F2FF',
      orderBy: 'name',
      orderDirection: 'desc',
    });
    const params = projectQueryToParams(original);

    expect(params).toEqual({
      favorites: 'true',
      archived: 'true',
      color: '#D9F2FF',
      sort: 'name',
      dir: 'desc',
    });
    expect(projectQueryFromParams(convertToParamMap(params))).toEqual(original);
    expect(
      Object.values(projectQueryToParams(DEFAULT_PROJECT_QUERY)).every((v) => v === null),
    ).toBe(true);
  });

  it('ignores malformed values and upper-cases the color', () => {
    expect(
      projectQueryFromParams(
        convertToParamMap({ favorites: 'yes', color: '#abc', sort: 'size', dir: 'desc' }),
      ),
    ).toEqual(DEFAULT_PROJECT_QUERY);
    expect(projectQueryFromParams(convertToParamMap({ color: '#d9f2ff' })).color).toBe('#D9F2FF');
  });

  it('counts filters but not the sort', () => {
    expect(activeProjectFilterCount(query({ orderBy: 'name' }))).toBe(0);
    expect(activeProjectFilterCount(query({ favorites: true, color: '#2563EB' }))).toBe(2);
  });
});

describe('projectColors', () => {
  it('lists each color once, upper case and sorted', () => {
    expect(projectColors([...ALL, project({ projectId: 13, color: '#2563EB' })])).toEqual([
      '#2563EB',
      '#D9F2FF',
    ]);
  });
});

describe('applyProjectQuery', () => {
  it('shows active projects in custom order, without the Inbox', () => {
    expect(names(applyProjectQuery(ALL, query()))).toEqual(['Beta', 'alpha']);
  });

  it('filters by favorite, archived and color', () => {
    expect(names(applyProjectQuery(ALL, query({ favorites: true })))).toEqual(['Beta']);
    expect(names(applyProjectQuery(ALL, query({ archived: true })))).toEqual(['Gamma']);
    expect(names(applyProjectQuery(ALL, query({ color: '#2563EB' })))).toEqual(['alpha']);
  });

  it('sorts by name without regard to case', () => {
    expect(names(applyProjectQuery(ALL, query({ orderBy: 'name' })))).toEqual(['alpha', 'Beta']);
    expect(
      names(applyProjectQuery(ALL, query({ orderBy: 'name', orderDirection: 'desc' }))),
    ).toEqual(['Beta', 'alpha']);
  });

  it('sorts by date with missing dates last in either direction', () => {
    expect(names(applyProjectQuery(ALL, query({ orderBy: 'createdAt' })))).toEqual([
      'Beta',
      'alpha',
    ]);
    expect(names(applyProjectQuery(ALL, query({ orderBy: 'updatedAt' })))).toEqual([
      'alpha',
      'Beta',
    ]);
    expect(
      names(applyProjectQuery(ALL, query({ orderBy: 'updatedAt', orderDirection: 'desc' }))),
    ).toEqual(['alpha', 'Beta']);
  });
});
