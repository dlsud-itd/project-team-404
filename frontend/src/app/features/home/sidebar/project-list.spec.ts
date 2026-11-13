import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { clearSettingsCache, seedSettings } from '../../settings/testing/settings-cache';
import { DashboardStore } from '../dashboard.store';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS } from '../testing/dashboard-fixture';
import { ProjectList } from './project-list';

describe('ProjectList (sidebar)', () => {
  let fixture: ComponentFixture<ProjectList>;
  let store: DashboardStore;
  let page: HTMLElement;

  const row = (name: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button.row')].find(
      (button) => button.querySelector('.name')?.textContent === name,
    )!;
  const names = () => [...page.querySelectorAll('.project .name')].map((node) => node.textContent);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [DashboardStore],
    });
    store = TestBed.inject(DashboardStore);
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('lists API projects with open-task counts', () => {
    expect(row('All Projects').querySelector('.count')?.textContent).toBe('8');
    expect(names()).toEqual(['Inbox', 'School', 'Work', 'Personal']);
    expect(row('School').querySelector('.count')?.textContent).toBe('3');
  });

  it('toggles a project filter, with aria-pressed following it', () => {
    row('Work').click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({ projectId: 2 });
    expect(row('Work').getAttribute('aria-pressed')).toBe('true');
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('false');

    row('Work').click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({});
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('true');
  });

  it('does not expose local-only project mutations in the dashboard filter', () => {
    expect(page.querySelector('button[aria-label^="Rename"]')).toBeNull();
    expect(page.querySelector('button[aria-label^="Delete"]')).toBeNull();
    expect(page.textContent).toContain('Create and manage projects in the Projects tab');
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
    TestBed.inject(DashboardStore).setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => clearSettingsCache());

  it('lists at most the saved number of projects, with View all linking to the Projects tab', () => {
    expect(names()).toEqual(['Inbox', 'School']);
    const viewAll = page.querySelector<HTMLAnchorElement>('a.view-all')!;
    expect(viewAll.textContent?.trim()).toBe('View all (4)');
    expect(viewAll.getAttribute('href')).toBe('/home?tab=projects');
    expect(viewAll.getAttribute('aria-label')).toBe('View all 4 projects');
    // All Projects still counts every open task.
    expect(page.querySelector('button.row.all .count')?.textContent).toBe('8');
  });

  it('keeps the list scrollable within the card', () => {
    const list = page.querySelector<HTMLElement>('ul.list')!;
    expect(list.getAttribute('aria-label')).toBe('Projects');
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });
});
