import { TestBed } from '@angular/core/testing';
import type { Project } from '../types/project.types';
import { ProjectsStore } from './projects.store';

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

const INBOX = project({ projectId: 1, name: 'Inbox', isInbox: true, sortOrder: 5 });
const SCHOOL = project({ projectId: 10, name: 'School', sortOrder: 2 });
const WORK = project({ projectId: 11, name: 'Work', sortOrder: 0 });
const OLD = project({ projectId: 12, name: 'Old', isArchived: true, sortOrder: 1 });

describe('ProjectsStore', () => {
  let store: ProjectsStore;

  beforeEach(() => {
    store = TestBed.inject(ProjectsStore);
  });

  it('starts empty and idle', () => {
    expect(store.projects()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.inbox()).toBeNull();
  });

  it('marks loading and clears an earlier error', () => {
    store.fail('Boom');
    store.startLoading();

    expect(store.loading()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('lists the Inbox first, then by sortOrder', () => {
    store.setProjects([SCHOOL, WORK, INBOX]);

    expect(store.projects().map((p) => p.name)).toEqual(['Inbox', 'Work', 'School']);
    expect(store.inbox()).toEqual(INBOX);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(true);
  });

  it('keeps archived projects out of the active list', () => {
    store.setProjects([INBOX, SCHOOL, OLD]);

    expect(store.active().map((p) => p.projectId)).toEqual([1, 10]);
    expect(store.projects()).toHaveLength(3);
  });

  it('records a failure and stops loading', () => {
    store.startLoading();
    store.fail('Something went wrong.');

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Something went wrong.');
  });

  it('adds a new project and replaces an existing one', () => {
    store.setProjects([INBOX, SCHOOL]);

    store.upsert(WORK);
    store.upsert({ ...SCHOOL, name: 'Uni' });

    expect(store.projects().map((p) => p.name)).toEqual(['Inbox', 'Work', 'Uni']);
  });

  it('patches only the given fields and never the id', () => {
    store.setProjects([SCHOOL]);

    store.patch(10, { description: 'Classes', projectId: 99 });

    expect(store.byId(10)).toEqual({ ...SCHOOL, description: 'Classes' });
  });

  it('removes a project', () => {
    store.setProjects([INBOX, SCHOOL]);

    store.remove(10);

    expect(store.byId(10)).toBeUndefined();
    expect(store.projects()).toEqual([INBOX]);
  });

  it('lists archived projects on their own', () => {
    store.setProjects([INBOX, SCHOOL, OLD]);

    expect(store.archived()).toEqual([OLD]);
  });

  it('sets many sort orders at once and leaves the others alone', () => {
    store.setProjects([INBOX, SCHOOL, WORK, OLD]);

    store.applySortOrders([
      { projectId: 10, sortOrder: 0 },
      { projectId: 11, sortOrder: 3 },
    ]);

    expect(store.projects().map((p) => p.name)).toEqual(['Inbox', 'School', 'Old', 'Work']);
    expect(store.byId(12)?.sortOrder).toBe(1);
  });

  it('remembers the selected project', () => {
    store.setProjects([INBOX, SCHOOL]);
    expect(store.selected()).toBeNull();

    store.select(10);

    expect(store.selectedProjectId()).toBe(10);
    expect(store.selected()).toEqual(SCHOOL);
  });

  it('has no selected project once that project is removed', () => {
    store.setProjects([INBOX, SCHOOL]);
    store.select(10);

    store.remove(10);

    expect(store.selected()).toBeNull();
  });

  it('resets to the initial state', () => {
    store.setProjects([INBOX]);
    store.select(1);
    store.fail('Boom');

    store.reset();

    expect(store.projects()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.selectedProjectId()).toBeNull();
  });
});
