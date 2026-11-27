import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { PrioritiesStore } from '../../settings/state/priorities.store';
import { DashboardStore } from '../dashboard.store';
import { DASHBOARD_PROJECTS, DASHBOARD_TASKS } from '../testing/dashboard-fixture';
import { PriorityList } from './priority-list';

describe('PriorityList (sidebar)', () => {
  let fixture: ComponentFixture<PriorityList>;
  let store: DashboardStore;
  let page: HTMLElement;

  const rows = () => [...page.querySelectorAll<HTMLButtonElement>('button.row')];
  const badges = () => rows().map((r) => r.querySelector<HTMLElement>('.label')!);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    await TestBed.configureTestingModule({
      imports: [PriorityList],
      providers: [DashboardStore, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    store.setData(DASHBOARD_PROJECTS, DASHBOARD_TASKS);
    fixture = TestBed.createComponent(PriorityList);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('lists the built-in levels with their open-task counts until the user’s load', () => {
    expect(badges().map((badge) => badge.textContent?.trim())).toEqual(['High', 'Medium', 'Low']);
    expect(rows().map((r) => r.querySelector('.count')?.textContent)).toEqual(['3', '3', '2']);
  });

  it('shows the user’s own levels in their order and colors', () => {
    const levels = TestBed.inject(PrioritiesStore);
    levels.load();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/api/priorities`)
      .flush([
        { id: 3, name: 'Low', color: '#6E9F79', sortOrder: 2, isDefault: false, taskCount: 2 },
        { id: 7, name: 'Blocker', color: '#C44536', sortOrder: 0, isDefault: false, taskCount: 0 },
        { id: 1, name: 'High', color: '#D84A4A', sortOrder: 1, isDefault: true, taskCount: 3 },
      ]);
    fixture.detectChanges();

    expect(badges().map((badge) => badge.textContent?.trim())).toEqual(['Blocker', 'High', 'Low']);
    const accent = (i: number) =>
      badges()[i].querySelector<HTMLElement>('.chip')!.style.getPropertyValue('--priority-accent');
    // A custom level tints with its own color, as its tasks do.
    expect(accent(0)).toBe('#C44536');
    // A standard name uses the shared palette, whatever color it was saved with.
    expect(accent(1)).toBe('var(--priority-high-accent)');
    expect(rows().map((r) => r.querySelector('.count')?.textContent)).toEqual(['0', '3', '2']);
  });

  it('toggles a priority filter, with aria-pressed following it', () => {
    const [high, medium] = rows();
    high.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({ priorityId: 1 });
    expect(high.getAttribute('aria-pressed')).toBe('true');

    medium.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({ priorityId: 2 });
    expect(high.getAttribute('aria-pressed')).toBe('false');

    medium.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({});
    expect(medium.getAttribute('aria-pressed')).toBe('false');
  });
});
