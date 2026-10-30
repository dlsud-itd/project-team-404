import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingClosing } from './landing-closing';

describe('LandingClosing', () => {
  let fixture: ComponentFixture<LandingClosing>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingClosing],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LandingClosing);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows the closing heading', () => {
    expect(page.querySelector('#closing-heading')?.textContent?.trim()).toBe(
      'Get your first task done today.',
    );
    expect(page.querySelector('section')?.getAttribute('aria-labelledby')).toBe('closing-heading');
  });

  it('links to sign-up and log-in', () => {
    const links = [...page.querySelectorAll('.actions a')].map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Create free account', '/register'],
      ['I already have an account', '/login'],
    ]);
  });
});
