import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
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
    store.filter.set({ priority: 'high' });
    fixture.detectChanges();

    expect(column('current')).toEqual([]);
    expect(
      page.querySelector('section[aria-labelledby="col-current"] .empty')?.textContent?.trim(),
    ).toBe('Nothing here');
  });
});
