import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingFeatures } from './landing-features';

describe('LandingFeatures', () => {
  let fixture: ComponentFixture<LandingFeatures>;
  let page: HTMLElement;

  const all = (selector: string) => [...page.querySelectorAll<HTMLElement>(selector)];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LandingFeatures] }).compileComponents();
    fixture = TestBed.createComponent(LandingFeatures);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows the four feature groups under one heading', () => {
    expect(page.querySelector('h2')?.textContent?.trim()).toBe('Everything you need');
    expect(all('.row h3').map((h) => h.textContent?.trim())).toEqual([
      'Task Management',
      'Scheduling & Organization',
      'Projects & Dashboard',
      'Account & Security',
    ]);
  });

  it('lists each group as cards, with the four-card layout for groups of four', () => {
    const rows = all('.row');
    expect(rows.map((row) => row.querySelectorAll('.card').length)).toEqual([3, 4, 3, 4]);
    expect(
      rows.map((row) => row.querySelector('.cards')!.classList.contains('cards--four')),
    ).toEqual([false, true, false, true]);
    expect(rows[0].querySelector('.card')?.textContent?.trim()).toBe('Add Tasks');
  });

  it('hides the decorative icons from assistive tech', () => {
    const icons = all('svg');
    expect(icons).toHaveLength(4);
    expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
