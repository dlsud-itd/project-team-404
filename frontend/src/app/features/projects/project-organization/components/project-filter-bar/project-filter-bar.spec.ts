import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_PROJECT_QUERY, type ProjectQuery } from '../../utils/project-query-params.util';
import { ProjectFilterBar } from './project-filter-bar';

describe('ProjectFilterBar', () => {
  let fixture: ComponentFixture<ProjectFilterBar>;
  let host: HTMLElement;
  let changes: Partial<ProjectQuery>[];
  let cleared: number;

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const chip = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('.chip')].find((c) =>
      clean(c.textContent).startsWith(name),
    )!;
  const options = () => [...host.querySelectorAll<HTMLLabelElement>('.panel .option')];

  function render(query: Partial<ProjectQuery> = {}): void {
    fixture.componentRef.setInput('query', { ...DEFAULT_PROJECT_QUERY, ...query });
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectFilterBar);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('colors', ['#2563EB', '#D9F2FF']);
    changes = [];
    cleared = 0;
    fixture.componentInstance.changed.subscribe((change) => changes.push(change));
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    render();
  });

  it('toggles Favorites and Archived as pressed buttons', () => {
    expect(chip('Favorites').getAttribute('aria-pressed')).toBe('false');

    chip('Favorites').click();
    chip('Archived').click();
    expect(changes).toEqual([{ favorites: true }, { archived: true }]);

    render({ favorites: true });
    expect(chip('Favorites').getAttribute('aria-pressed')).toBe('true');
    chip('Favorites').click();
    expect(changes.at(-1)).toEqual({ favorites: false });
  });

  it('picks a color from a disclosure panel of radios', () => {
    const color = chip('Color');
    expect(color.getAttribute('aria-expanded')).toBe('false');

    color.click();
    fixture.detectChanges();

    expect(color.getAttribute('aria-expanded')).toBe('true');
    expect(options().map((o) => clean(o.textContent))).toEqual(['Any color', '#2563EB', '#D9F2FF']);
    options()[2].querySelector('input')!.click();
    expect(changes).toEqual([{ color: '#D9F2FF' }]);

    render({ color: '#D9F2FF' });
    expect(clean(chip('Color').textContent)).toBe('Color: #D9F2FF');
    expect(chip('Color').classList).toContain('active');
  });

  it('says so when no project has a color', () => {
    fixture.componentRef.setInput('colors', []);
    chip('Color').click();
    fixture.detectChanges();

    expect(clean(el('.hint')?.textContent)).toBe('None of your projects has a color yet.');
  });

  it('closes the color panel with Escape and refocuses its chip', () => {
    chip('Color').click();
    fixture.detectChanges();
    const radio = el<HTMLInputElement>('.panel input')!;
    radio.focus();

    radio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el('.panel')).toBeNull();
    expect(document.activeElement).toBe(chip('Color'));
  });

  it('counts the active filters, announces them and clears them', () => {
    expect(el('.clear')).toBeNull();
    expect(el('[aria-live="polite"]')?.textContent).toBe('No filters applied');

    render({ favorites: true, color: '#2563EB' });
    expect(clean(el('.count')?.textContent)).toBe('2 filters');
    expect(el('[aria-live="polite"]')?.textContent).toBe('2 filters applied');

    el<HTMLButtonElement>('.clear')!.click();
    expect(cleared).toBe(1);
  });
});
