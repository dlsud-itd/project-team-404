import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiniCalendar } from './mini-calendar';

describe('MiniCalendar', () => {
  let fixture: ComponentFixture<MiniCalendar>;
  let page: HTMLElement;

  const heading = () => page.querySelector('h2')?.textContent?.trim();
  const days = () => [...page.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent);

  function shift(label: string): void {
    page.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    await TestBed.configureTestingModule({ imports: [MiniCalendar] }).compileComponents();
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
    // 1 October 2026 is a Thursday: three blank cells first, then 31 days.
    expect(days().slice(0, 4)).toEqual(['', '', '', '1']);
    expect(days().filter(Boolean)).toHaveLength(31);
    expect(page.querySelector('[aria-current="date"]')?.textContent).toBe('30');
  });

  it('moves between months and marks today only in the current month', () => {
    shift('Next month');
    expect(heading()).toBe('November 2026');
    expect(page.querySelector('[aria-current="date"]')).toBeNull();

    shift('Previous month');
    shift('Previous month');
    expect(heading()).toBe('September 2026');

    shift('Next month');
    expect(page.querySelector('[aria-current="date"]')?.textContent).toBe('30');
  });
});
