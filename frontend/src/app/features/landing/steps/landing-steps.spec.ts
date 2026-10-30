import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingSteps } from './landing-steps';

describe('LandingSteps', () => {
  let fixture: ComponentFixture<LandingSteps>;
  let page: HTMLElement;

  const all = (selector: string) => [...page.querySelectorAll<HTMLElement>(selector)];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LandingSteps] }).compileComponents();
    fixture = TestBed.createComponent(LandingSteps);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('names the section for screen readers', () => {
    const heading = page.querySelector('h2');
    expect(heading?.textContent?.trim()).toBe('How it works');
    expect(heading?.classList).toContain('visually-hidden');
    expect(page.querySelector('section')?.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('lists the four steps in order as an ordered list', () => {
    expect(all('ol > li h3').map((h) => h.textContent?.trim())).toEqual([
      'Create your account',
      'Set up your projects',
      'Add and organize tasks',
      'Check your dashboard',
    ]);
  });

  it('hides the decorative step numbers, since the list already numbers them', () => {
    const numbers = all('.number');
    expect(numbers.map((n) => n.textContent?.trim())).toEqual(['01', '02', '03', '04']);
    expect(numbers.every((n) => n.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
