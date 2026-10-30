import { ViewportScroller } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../../../../src/app/app';
import { appConfig } from '../../../../src/app/app.config';
import { SessionService } from '../../../../src/app/features/auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import { environment } from '../../../../src/environments/environment';

/**
 * Landing page frontend integration tests.
 *
 * The app runs with its real appConfig: the '' route behind guestGuard, SessionService, the
 * restore-session initializer and the router's anchor scrolling. Only the network is faked: GET /api/auth/me is answered with the body from backend/src/features/auth.
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const TOKEN = 'session-token';
const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

describe('Landing integration (landing page, guestGuard, session)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const link = (label: string, scope = '') =>
    all(`${scope} a`).find((a) => a.textContent?.replace(/\s+/g, ' ').trim() === label)!;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /** Starts the app the way a page load does, optionally with a token kept from earlier. */
  async function startApp(savedToken?: string): Promise<void> {
    if (savedToken) localStorage.setItem(TOKEN_STORAGE_KEY, savedToken);
    // The app's own providers (router with anchor scrolling, interceptor, session restore);
    // only the network is replaced.
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  }

  async function openAsGuest(): Promise<void> {
    await startApp();
    await harness.navigateByUrl('/');
    await settle();
  }

  async function click(anchor: HTMLElement): Promise<void> {
    anchor.click();
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => http.verify());

  // Case 1
  it('shows a guest the landing page, titled HabitTracker, without any request', async () => {
    await openAsGuest();

    expect(router.url).toBe('/');
    expect(TestBed.inject(Title).getTitle()).toBe('HabitTracker');
    expect(text('h1')).toMatch(/^Build habits that last,\s*forever$/);
    expect(all('app-landing-features h3').map((h) => h.textContent?.trim())).toEqual([
      'Task Management',
      'Scheduling & Organization',
      'Projects & Dashboard',
      'Account & Security',
    ]);
    expect(all('app-landing-steps ol > li')).toHaveLength(4);
    expect(text('#closing-heading')).toBe('Get your first task done today.');
    expect(el('app-landing-footer footer')).toBeTruthy();
    // No session to restore, so nothing is sent.
    http.expectNone(() => true);
  });

  // Case 2
  it.each([
    ['Get Started', '.topbar', '/register'],
    ['Create free account', '.hero', '/register'],
    ['Create free account', 'app-landing-closing', '/register'],
    ['Log in', '.topbar', '/login'],
    ['I already have an account', 'app-landing-closing', '/login'],
  ])('"%s" in %s goes to %s', async (label, scope, url) => {
    await openAsGuest();
    await click(link(label, scope));

    expect(router.url).toBe(url);
  });

  // Case 3
  describe('section links', () => {
    let host: HTMLElement;

    afterEach(() => host.remove());

    /**
     * Bootstraps the real root component, as main.ts does. The router only starts its anchor
     * scrolling from the app's bootstrap listener, which a plain TestBed render never runs.
     */
    async function bootstrapAsGuest(): Promise<ApplicationRef> {
      await startApp();
      host = document.createElement('app-root');
      document.body.append(host);
      const appRef = TestBed.inject(ApplicationRef);
      appRef.bootstrap(App, host);
      await router.navigateByUrl('/');
      await appRef.whenStable();
      return appRef;
    }

    it.each([
      ['Features', 'features', 'app-landing-features'],
      ['How it works', 'how-it-works', 'app-landing-steps'],
      ['About', 'about', 'app-landing-footer'],
    ])('"%s" scrolls to #%s', async (label, fragment, target) => {
      const appRef = await bootstrapAsGuest();
      const scrollToAnchor = vi
        .spyOn(TestBed.inject(ViewportScroller), 'scrollToAnchor')
        .mockImplementation(() => {});
      const anchor = [...host.querySelectorAll<HTMLAnchorElement>('.nav a')].find(
        (a) => a.textContent?.trim() === label,
      )!;

      expect(anchor.getAttribute('href')).toBe(`/#${fragment}`);
      expect(host.querySelector(target)?.id).toBe(fragment);

      anchor.click();
      await appRef.whenStable();
      // The router scrolls once the navigation has rendered.
      await vi.waitFor(() => expect(scrollToAnchor).toHaveBeenCalledWith(fragment));
      expect(router.url).toBe(`/#${fragment}`);
    });
  });

  // Case 4
  it('sends a signed-in user away from / once GET /api/auth/me restores the session', async () => {
    await startApp(TOKEN);
    const navigation = harness.navigateByUrl('/');
    const req = http.expectOne(`${AUTH_API}/me`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    req.flush(USER);
    await navigation;
    await settle();

    expect(router.url).toBe('/home');
    expect(TestBed.inject(SessionService).currentUser()?.username).toBe('james');
    expect(page().querySelector('app-landing-features')).toBeNull();
  });

  it('shows the landing page when the stored token is rejected', async () => {
    await startApp(TOKEN);
    const navigation = harness.navigateByUrl('/');
    http
      .expectOne(`${AUTH_API}/me`)
      .flush({ error: 'Token invalid or expired' }, { status: 401, statusText: 'Unauthorized' });
    await navigation;
    await settle();

    expect(router.url).toBe('/');
    expect(text('h1')).toMatch(/^Build habits that last,\s*forever$/);
  });

  // Case 5
  it('gives every image alt text or hides it, and keeps headings in order', async () => {
    await openAsGuest();

    const images = all('img, svg');
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      const hidden = image.closest('[aria-hidden="true"]') !== null;
      const alt = image.getAttribute('alt')?.trim();
      expect(hidden || !!alt, `${image.outerHTML.slice(0, 80)} needs alt text`).toBe(true);
    }

    const levels = all('h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    // No level is skipped on the way down (h1 → h3 would be).
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });
});
