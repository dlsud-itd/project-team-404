import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Landing } from './landing';

describe('Landing', () => {
  let fixture: ComponentFixture<Landing>;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const all = (selector: string) => [...page.querySelectorAll<HTMLElement>(selector)];
  const href = (selector: string) => el(selector)?.getAttribute('href');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Landing);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('links the nav to the page sections by fragment', () => {
    const links = all('nav[aria-label="Main"] a').map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Features', '/#features'],
      ['How it works', '/#how-it-works'],
      ['About', '/#about'],
    ]);
  });

  it('links Log in, Get Started and the hero button to the auth pages', () => {
    expect(href('.topbar .login')).toBe('/login');
    expect(href('.topbar .cta')).toBe('/register');
    expect(href('.hero .cta')).toBe('/register');
    expect(el('.hero .cta')?.textContent?.trim()).toBe('Create free account');
  });

  it('shows the hero heading and illustrations with alt text', () => {
    expect(el('h1')?.id).toBe('hero-heading');
    expect(el('.hero')?.getAttribute('aria-labelledby')).toBe('hero-heading');
    expect(all('.showcase-card img').map((img) => img.getAttribute('alt'))).toEqual([
      'Focus illustration',
      'Routine illustration',
      'Consistent illustration',
    ]);
    expect(el('.hero-art img')?.getAttribute('alt')).toBeTruthy();
    expect(all('.showcase-tags .tag').map((t) => t.textContent?.trim())).toEqual([
      'Focus',
      'Routine',
      'Consistent',
    ]);
  });

  it('places the sections at the ids the nav links point to', () => {
    expect(el('app-landing-features')?.id).toBe('features');
    expect(el('app-landing-steps')?.id).toBe('how-it-works');
    expect(el('app-landing-footer')?.id).toBe('about');
    expect(el('app-landing-closing')).toBeTruthy();
  });
});
