import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/services/toast.service';
import { ProjectsStore } from '../../projects/shared/state/projects.store';
import type { Project } from '../../projects/shared/types/project.types';
import { SettingsStore } from '../../settings/state/settings.store';
import { clearSettingsCache, seedSettings } from '../../settings/testing/settings-cache';
import { DEFAULT_SETTINGS } from '../../settings/types/user-settings.types';
import { DashboardStore } from '../dashboard.store';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS } from '../testing/dashboard-fixture';
import { ProjectList } from './project-list';
import { sortDashboardProjects } from './sort-dashboard-projects.util';

const SETTINGS_URL = `${environment.apiBaseUrl}/api/settings`;

/** School, Work and Personal starred, with creation and access times to sort by. */
const STARRED: Project[] = DASHBOARD_PROJECTS.map((project) => {
  const times: Record<number, Partial<Project>> = {
    1: { createdAt: '2026-01-03T00:00:00Z', lastAccessedAt: '2026-11-20T00:00:00Z' },
    2: { createdAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-11-25T00:00:00Z' },
    3: { createdAt: '2026-01-02T00:00:00Z', lastAccessedAt: null },
  };
  return project.isInbox ? project : { ...project, isFavorite: true, ...times[project.projectId] };
});

describe('ProjectList (sidebar)', () => {
  let fixture: ComponentFixture<ProjectList>;
  let store: DashboardStore;
  let projects: ProjectsStore;
  let http: HttpTestingController;
  let page: HTMLElement;

  const row = (name: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button.row')].find(
      (button) => button.querySelector('.name')?.textContent === name,
    )!;
  const names = () => [...page.querySelectorAll('.project .name')].map((node) => node.textContent);
  const render = () => fixture.detectChanges();
  const sortSelect = () => page.querySelector<HTMLSelectElement>('.sort select')!;

  function open(list: Project[] = STARRED): void {
    store = TestBed.inject(DashboardStore);
    projects = TestBed.inject(ProjectsStore);
    store.setData(list, DASHBOARD_TASKS);
    projects.setProjects(list);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    render();
  }

  beforeEach(() => {
    clearSettingsCache();
    TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [
        DashboardStore,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearSettingsCache();
  });

  it('lists only favorite projects, in custom order, with open-task counts', () => {
    open([...STARRED.slice(0, 3), { ...STARRED[3], isFavorite: false }]);

    expect(row('All Projects').querySelector('.count')?.textContent).toBe('8');
    expect(names()).toEqual(['School', 'Work']);
    expect(row('School').querySelector('.count')?.textContent).toBe('3');
  });

  it('invites the user to star a project when none is a favorite', () => {
    open(DASHBOARD_PROJECTS);

    expect(names()).toEqual([]);
    expect(page.querySelector('.empty')?.textContent).toContain('Star a project to pin it here.');
    expect(page.querySelector('.empty a')?.getAttribute('href')).toBe('/home?tab=projects');
    // No sorting to offer for an empty list.
    expect(page.querySelector('.sort')).toBeNull();
  });

  it('toggles a project filter, with aria-pressed following it', () => {
    open();
    row('Work').click();
    render();
    expect(store.filter()).toEqual({ projectId: 2 });
    expect(row('Work').getAttribute('aria-pressed')).toBe('true');
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('false');

    row('Work').click();
    render();
    expect(store.filter()).toEqual({});
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('true');
  });

  it('starts on the saved sort and saves a new one', () => {
    seedSettings({ dashboardProjectSort: 'name-asc' });
    open();
    expect(sortSelect().value).toBe('name-asc');
    expect(names()).toEqual(['Personal', 'School', 'Work']);

    sortSelect().value = 'recent';
    sortSelect().dispatchEvent(new Event('change'));
    render();
    // Shown at once, before the server answers.
    expect(names()).toEqual(['Work', 'School', 'Personal']);

    const req = http.expectOne(SETTINGS_URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dashboardProjectSort: 'recent' });
    req.flush({ ...DEFAULT_SETTINGS, dashboardProjectSort: 'recent' });
    render();
    expect(TestBed.inject(SettingsStore).dashboardProjectSort()).toBe('recent');
    expect(names()).toEqual(['Work', 'School', 'Personal']);
  });

  it('goes back to the previous sort with a toast when saving fails', () => {
    open();
    sortSelect().value = 'name-desc';
    sortSelect().dispatchEvent(new Event('change'));
    http.expectOne(SETTINGS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    render();

    expect(names()).toEqual(['School', 'Work', 'Personal']);
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(
      expect.objectContaining({ kind: 'error' }),
    );
  });

  it('does not offer project changes in the dashboard filter', () => {
    open();
    expect(page.querySelector('button[aria-label^="Rename"]')).toBeNull();
    expect(page.querySelector('button[aria-label^="Delete"]')).toBeNull();
  });
});

describe('ProjectList (sidebar) with a dashboard project limit', () => {
  let fixture: ComponentFixture<ProjectList>;
  let page: HTMLElement;

  const names = () => [...page.querySelectorAll('.project .name')].map((node) => node.textContent);

  beforeEach(() => {
    seedSettings({ dashboardProjectLimit: 2 });
    TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [DashboardStore, provideRouter([])],
    });
    TestBed.inject(DashboardStore).setData(STARRED, DASHBOARD_TASKS);
    TestBed.inject(ProjectsStore).setProjects(STARRED);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => clearSettingsCache());

  it('lists at most the saved number of favorites, with View all linking to the Projects tab', () => {
    expect(names()).toEqual(['School', 'Work']);
    const viewAll = page.querySelector<HTMLAnchorElement>('a.view-all')!;
    expect(viewAll.textContent?.trim()).toBe('View all (3)');
    expect(viewAll.getAttribute('href')).toBe('/home?tab=projects');
    expect(viewAll.getAttribute('aria-label')).toBe('View all 3 favorite projects');
    // All Projects still counts every open task.
    expect(page.querySelector('button.row.all .count')?.textContent).toBe('8');
  });

  it('keeps the list scrollable within the card', () => {
    const list = page.querySelector<HTMLElement>('ul.list')!;
    expect(list.getAttribute('aria-label')).toBe('Favorite projects');
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });
});

describe('sortDashboardProjects', () => {
  const [, school, work, personal] = STARRED;
  const ids = (list: Project[]) => list.map((p) => p.name);

  it('orders by the custom drag order', () => {
    expect(ids(sortDashboardProjects([personal, work, school], 'custom'))).toEqual([
      'School',
      'Work',
      'Personal',
    ]);
  });

  it('orders by name either way, ignoring case', () => {
    const lower = { ...work, name: 'apple' };
    expect(ids(sortDashboardProjects([school, lower, personal], 'name-asc'))).toEqual([
      'apple',
      'Personal',
      'School',
    ]);
    expect(ids(sortDashboardProjects([school, lower, personal], 'name-desc'))).toEqual([
      'School',
      'Personal',
      'apple',
    ]);
  });

  it('puts the most recently opened first and never-opened ones last', () => {
    expect(ids(sortDashboardProjects([personal, school, work], 'recent'))).toEqual([
      'Work',
      'School',
      'Personal',
    ]);
  });

  it('orders by creation date, newest or oldest first', () => {
    expect(ids(sortDashboardProjects([school, work, personal], 'created-desc'))).toEqual([
      'School',
      'Personal',
      'Work',
    ]);
    expect(ids(sortDashboardProjects([school, work, personal], 'created-asc'))).toEqual([
      'Work',
      'Personal',
      'School',
    ]);
  });
});
