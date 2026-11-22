import type { Project } from '../../shared/types/project.types';
import { splitProjects } from './split-projects.util';

const project = (overrides: Partial<Project>): Project => ({
  projectId: 1,
  name: 'Project',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
  ...overrides,
});

const INBOX = project({ projectId: 1, name: 'Inbox', isInbox: true });
const GYM = project({ projectId: 10, name: 'Gym', isFavorite: true });
const SCHOOL = project({ projectId: 11, name: 'School' });
const WORK = project({ projectId: 12, name: 'Work' });
const OLD = project({ projectId: 13, name: 'Old', isArchived: true });
const OLD_FAVORITE = project({
  projectId: 14,
  name: 'Old fav',
  isArchived: true,
  isFavorite: true,
});

describe('splitProjects', () => {
  it('puts each project in its group and keeps the given order', () => {
    const split = splitProjects([INBOX, WORK, GYM, OLD, SCHOOL]);

    expect(split.inbox).toEqual(INBOX);
    expect(split.favorites).toEqual([GYM]);
    expect(split.active).toEqual([WORK, SCHOOL]);
    expect(split.archived).toEqual([OLD]);
  });

  it('counts an archived favorite as archived', () => {
    const split = splitProjects([OLD_FAVORITE]);

    expect(split.favorites).toEqual([]);
    expect(split.archived).toEqual([OLD_FAVORITE]);
  });

  it('never lists the Inbox in another group', () => {
    const split = splitProjects([{ ...INBOX, isFavorite: true }]);

    expect(split.inbox?.projectId).toBe(1);
    expect([...split.favorites, ...split.active, ...split.archived]).toEqual([]);
  });

  it('returns empty groups for no projects', () => {
    expect(splitProjects([])).toEqual({ inbox: null, favorites: [], active: [], archived: [] });
  });
});
