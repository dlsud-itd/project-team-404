import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { clearSettingsCache, seedSettings } from '../../settings/testing/settings-cache';
import { DashboardStore } from '../dashboard.store';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS } from '../testing/dashboard-fixture';
import { StatusColumns } from './status-columns';

describe('StatusColumns', () => {
  let fixture: ComponentFixture<StatusColumns>;
  let store: DashboardStore;
  let page: HTMLElement;

  const column = (status: string) =>
    [...page.querySelectorAll(`section[aria-labelledby="col-${status}"] .task .title`)].map((t) =>
      t.textContent?.trim(),
    );

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    await TestBed.configureTestingModule({
      imports: [StatusColumns],
      providers: [DashboardStore],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    fixture = TestBed.createComponent(StatusColumns);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('shows Current, Upcoming and Overdue columns labelled by their headings', () => {
    const headings = [...page.querySelectorAll('h2')];
    expect(headings.map((h) => h.textContent?.trim())).toEqual(['Current', 'Upcoming', 'Overdue']);
    expect(headings.map((h) => h.id)).toEqual(['col-current', 'col-upcoming', 'col-overdue']);
  });

  it('lists each open task in its column with a short due date', () => {
    expect(column('current')).toEqual(['Read chapter 4', 'Team stand-up notes']);
    expect(column('overdue')).toEqual(['Submit lab report', 'Reply to client email']);
    expect(column('upcoming')).toHaveLength(4);
    expect(page.querySelector('section[aria-labelledby="col-current"] .due')?.textContent).toBe(
      'Oct 30',
    );
  });

  it('shows "Nothing here" for an empty column', () => {
    store.filter.set({ priorityId: 1 });
    fixture.detectChanges();

    expect(column('current')).toEqual([]);
    expect(
      page.querySelector('section[aria-labelledby="col-current"] .empty')?.textContent?.trim(),
    ).toBe('Nothing here');
  });
});

describe('StatusColumns with a dashboard task limit', () => {
  let fixture: ComponentFixture<StatusColumns>;
  let page: HTMLElement;

  const section = (status: string) =>
    page.querySelector<HTMLElement>(`section[aria-labelledby="col-${status}"]`)!;
  const titles = (status: string) =>
    [...section(status).querySelectorAll('.task .title')].map((t) => t.textContent?.trim());

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    seedSettings({ dashboardTaskLimit: 2 });
    await TestBed.configureTestingModule({
      imports: [StatusColumns],
      providers: [DashboardStore, provideRouter([])],
    }).compileComponents();
    TestBed.inject(DashboardStore).setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    fixture = TestBed.createComponent(StatusColumns);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearSettingsCache();
  });

  it('lists at most the saved number of tasks per column, with View all for the rest', () => {
    expect(titles('upcoming')).toEqual(['Study for quiz', 'Prepare sprint demo']);
    const viewAll = section('upcoming').querySelector<HTMLAnchorElement>('a.view-all')!;
    expect(viewAll.textContent?.trim()).toBe('View all (4)');
    expect(viewAll.getAttribute('href')).toBe('/home?tab=tasks');
    expect(viewAll.getAttribute('aria-label')).toBe('View all 4 upcoming tasks');

    // Columns that fit show no link.
    expect(titles('current')).toHaveLength(2);
    expect(section('current').querySelector('a.view-all')).toBeNull();
    expect(section('overdue').querySelector('a.view-all')).toBeNull();
  });

  it('keeps each column’s list scrollable within the card', () => {
    const list = section('upcoming').querySelector<HTMLElement>('ul.list')!;
    expect(list.getAttribute('tabindex')).toBe('0');
    expect(list.getAttribute('aria-label')).toBe('Upcoming tasks');
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });
});
