import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingFooter } from './landing-footer';

describe('LandingFooter', () => {
  let fixture: ComponentFixture<LandingFooter>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LandingFooter] }).compileComponents();
    fixture = TestBed.createComponent(LandingFooter);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows the brand, tagline and description in a footer landmark', () => {
    const footer = page.querySelector('footer');
    expect(footer).toBeTruthy();
    expect(footer?.querySelector('.brand')?.textContent?.trim()).toBe('HabitTracker');
    // The <br /> separates the two lines; "Get it done" keeps its space.
    expect(footer?.querySelector('.tagline')?.textContent?.trim()).toMatch(
      /^Plan\. Prioritize\s*Get it done$/,
    );
    expect(footer?.querySelector('.text')?.textContent).toContain('one dashboard');
  });

  it('hides the large decorative wordmark from assistive tech', () => {
    expect(page.querySelector('.wordmark')?.getAttribute('aria-hidden')).toBe('true');
  });
});
