import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
import { MiniCalendar, taskCount } from './mini-calendar';

// The store's sample tasks are dated relative to today, which is Friday, October 30, 2026 here:
// two overdue (Oct 28, 29), three today (one done), then Nov 1, 2, 3 and 5.
describe('MiniCalendar', () => {
  let fixture: ComponentFixture<MiniCalendar>;
  let store: DashboardStore;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const heading = () => page.querySelector('h2')?.textContent?.trim();
  const days = () =>
    [...page.querySelectorAll<HTMLButtonElement>('button.day:not(.outside)')].map((c) =>
      c.textContent?.trim(),
    );
  const day = (key: string) => el<HTMLButtonElement>(`[data-date="${key}"]`)!;
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const mark = (key: string) => day(key).querySelector('.mark')?.getAttribute('data-mark') ?? null;

  function shift(label: string): void {
    page.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    fixture.detectChanges();
  }

  async function press(key: string, target: HTMLElement): Promise<void> {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));

    await TestBed.configureTestingModule({
      imports: [MiniCalendar],
      providers: [DashboardStore],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(MiniCalendar);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('shows the current month, Monday first, with today marked', () => {
    expect(heading()).toBe('October 2026');
    expect([...page.querySelectorAll('[role="columnheader"]')].map((c) => c.textContent)).toEqual([
      'Mo',
      'Tu',
      'We',
      'Th',
      'Fr',
      'Sa',
      'Su',
    ]);
    // October has 31 in-month days; the six-week grid also shows adjacent-month dates.
    expect(days().slice(0, 4)).toEqual(['1', '2', '3', '4']);
    expect(days().filter(Boolean)).toHaveLength(31);
    expect(page.querySelector('[aria-current="date"]')?.textContent?.trim()).toBe('30');
  });

  it('moves between months and marks today whenever it is in the displayed grid', () => {
    shift('Next month');
    expect(heading()).toBe('November 2026');
    expect(day('2026-10-30').getAttribute('aria-current')).toBe('date');
    expect(day('2026-10-30').classList).toContain('outside');

    shift('Previous month');
    shift('Previous month');
    expect(heading()).toBe('September 2026');
    expect(page.querySelector('[aria-current="date"]')).toBeNull();

    shift('Next month');
    expect(page.querySelector('[aria-current="date"]')?.textContent?.trim()).toBe('30');
  });

  it('shows six full weeks of the current month, with today marked', () => {
    expect(text('h2')).toBe('October 2026');
    expect(page.querySelectorAll('button.day')).toHaveLength(42);
    expect(day('2026-10-30').getAttribute('aria-current')).toBe('date');
    // Monday Sep 28 starts the grid; Oct 1 is a Thursday.
    expect(page.querySelector('button.day')?.getAttribute('data-date')).toBe('2026-09-28');
    expect(day('2026-09-30').classList).toContain('outside');
    expect(el('.today-button')).toBeNull();
  });

  it('puts a dot under days with tasks, coloured by the most urgent one', () => {
    store.toggleTask(9); // Nov 5's only task is now done.
    fixture.detectChanges();

    expect(mark('2026-10-28')).toBe('overdue');
    expect(mark('2026-10-30')).toBe('open');
    expect(mark('2026-11-05')).toBe('done');
    expect(mark('2026-10-31')).toBeNull();
  });

  it('says how many tasks a day has', () => {
    expect(day('2026-10-30').getAttribute('aria-label')).toBe('Friday, October 30, 3 tasks');
    expect(day('2026-10-30').title).toBe('3 tasks');
    expect(day('2026-10-31').getAttribute('aria-label')).toBe('Saturday, October 31');
    expect(day('2026-10-31').hasAttribute('title')).toBe(false);
  });

  it("filters the board to a day's tasks and summarises them", () => {
    day('2026-10-30').click();
    fixture.detectChanges();

    expect(store.filter()).toEqual({ due: '2026-10-30' });
    expect(store.filteredTasks().map((t) => t.id)).toEqual([3, 4, 5]);
    expect(day('2026-10-30').parentElement?.getAttribute('aria-selected')).toBe('true');
    expect(text('.summary p')).toBe('Fri, Oct 30 · 2 tasks to do, 1 done');
  });

  it('shows all tasks again when the same day is picked twice or Clear is pressed', () => {
    day('2026-10-30').click();
    day('2026-10-30').click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({});
    expect(el('.summary')).toBeNull();

    day('2026-10-31').click();
    fixture.detectChanges();
    expect(text('.summary p')).toBe('Sat, Oct 31 · Nothing due');

    el<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({});
  });

  it('asks for a new task on the picked day', () => {
    let requested: string | undefined;
    fixture.componentInstance.addTask.subscribe((key) => (requested = key));

    day('2026-11-02').click();
    fixture.detectChanges();
    el<HTMLButtonElement>('.add')!.click();

    expect(requested).toBe('2026-11-02');
  });

  it('moves to the next month when one of its faded days is picked', () => {
    day('2026-11-01').click();
    fixture.detectChanges();

    expect(text('h2')).toBe('November 2026');
    expect(el('.grid')?.getAttribute('data-slide')).toBe('right');
    expect(day('2026-11-01').classList).not.toContain('outside');
  });

  it('changes month with the arrows and comes back with Today', () => {
    el<HTMLButtonElement>('[aria-label="Previous month"]')!.click();
    fixture.detectChanges();
    expect(text('h2')).toBe('September 2026');
    expect(el('.grid')?.getAttribute('data-slide')).toBe('left');

    el<HTMLButtonElement>('.today-button')!.click();
    fixture.detectChanges();
    expect(text('h2')).toBe('October 2026');
    expect(el('.today-button')).toBeNull();
  });

  it('keeps exactly one day in the Tab order, starting on today', () => {
    const tabbable = () =>
      [...page.querySelectorAll<HTMLButtonElement>('button.day')].filter((b) => b.tabIndex === 0);

    expect(tabbable().map((b) => b.dataset['date'])).toEqual(['2026-10-30']);

    el<HTMLButtonElement>('[aria-label="Next month"]')!.click();
    fixture.detectChanges();
    expect(tabbable().map((b) => b.dataset['date'])).toEqual(['2026-11-01']);
  });

  it('moves between days with the keyboard, changing month when needed', async () => {
    day('2026-10-30').focus();

    await press('ArrowRight', day('2026-10-30'));
    expect(document.activeElement).toBe(day('2026-10-31'));

    await press('ArrowDown', day('2026-10-31'));
    expect(text('h2')).toBe('November 2026');
    expect(document.activeElement).toBe(day('2026-11-07'));

    await press('Home', day('2026-11-07'));
    expect(document.activeElement).toBe(day('2026-11-02'));

    await press('PageUp', day('2026-11-02'));
    expect(text('h2')).toBe('October 2026');
    expect(document.activeElement).toBe(day('2026-10-02'));
  });

  it('keeps Page Down inside the next month', async () => {
    // November has no 31st, so Oct 31 goes to Nov 30.
    await press('PageDown', day('2026-10-31'));

    expect(text('h2')).toBe('November 2026');
    expect(document.activeElement).toBe(day('2026-11-30'));
  });
});

describe('taskCount', () => {
  it('words the count', () => {
    expect(taskCount(1)).toBe('1 task');
    expect(taskCount(4)).toBe('4 tasks');
  });
});
