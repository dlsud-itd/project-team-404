import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SortMenu, type SortChange, type SortOption } from './sort-menu';

const OPTIONS: SortOption[] = [
  { value: '', label: 'Default order' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'title', label: 'Title' },
];

describe('SortMenu', () => {
  let fixture: ComponentFixture<SortMenu>;
  let host: HTMLElement;
  let changes: SortChange[];

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const trigger = () => el<HTMLButtonElement>('.trigger')!;
  /** The open menu lives in the CDK overlay, outside the component. */
  const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];

  function render(value: string, direction: 'asc' | 'desc' = 'asc'): void {
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('direction', direction);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SortMenu);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('label', 'Sort tasks');
    changes = [];
    fixture.componentInstance.changed.subscribe((change) => changes.push(change));
    render('');
  });

  afterEach(() => fixture.destroy());

  it('shows the current sort on a menu button', () => {
    expect(trigger().textContent?.replace(/\s+/g, ' ').trim()).toBe('Sort: Default order');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('lists the options as radio menu items with the current one checked', () => {
    render('dueDate');
    trigger().click();
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe('Sort tasks');
    expect(items().map((i) => [i.textContent?.trim(), i.getAttribute('aria-checked')])).toEqual([
      ['Default order', 'false'],
      ['Due date', 'true'],
      ['Title', 'false'],
    ]);
  });

  it('reports the picked field and closes the menu', () => {
    trigger().click();
    fixture.detectChanges();

    items()[2].click();
    fixture.detectChanges();

    expect(changes).toEqual([{ value: 'title', direction: 'asc' }]);
    expect(items()).toHaveLength(0);
  });

  it('opens from the keyboard with focus on the first item', () => {
    trigger().focus();
    // The CDK reads keyCode, which browsers set but synthetic events leave at 0.
    trigger().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    fixture.detectChanges();

    expect(items()).toHaveLength(3);
    expect(document.activeElement).toBe(items()[0]);
  });

  it('hides the direction toggle for the default order', () => {
    expect(el('.direction')).toBeNull();
  });

  it('flips the direction with a pressed toggle', () => {
    render('title', 'asc');
    const toggle = el<HTMLButtonElement>('.direction')!;
    expect(toggle.getAttribute('aria-label')).toBe('Descending order');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    expect(changes).toEqual([{ value: 'title', direction: 'desc' }]);

    render('title', 'desc');
    expect(el('.direction')!.getAttribute('aria-pressed')).toBe('true');
  });
});
