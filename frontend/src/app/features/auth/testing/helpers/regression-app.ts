import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { routes } from '../../../../app.routes';
import { AVAILABILITY_DEBOUNCE_MS } from '../../register/register';
import { provideSessionRestore } from '../../session/auth.guards';
import { authInterceptor } from '../../session/auth.interceptor';
import { SessionService } from '../../session/session.service';
import { TOKEN_STORAGE_KEY } from '../../session/token-storage.service';
import { API, type FakeAuthApi } from './fake-auth-api';

/** Whole-app flows run several pages and a page refresh, so they need more than the 5 s default. */
export const REGRESSION_TIMEOUT_MS = 30_000;

export type SignUpDetails = { username: string; email: string; password: string };

/**
 * Runs the whole app (real routes, guards, interceptor, pages and services) against a
 * FakeAuthApi, and drives it the way a user does: typing, submitting, clicking links.
 * restart() is a page refresh: a new app that only keeps what is in browser storage.
 */
export class RegressionApp {
  harness!: RouterTestingHarness;
  http!: HttpTestingController;
  router!: Router;
  session!: SessionService;

  constructor(readonly api: FakeAuthApi) {}

  async start(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
      ],
    });
    // The first inject runs the app initializers, which start the session restore.
    this.http = TestBed.inject(HttpTestingController);
    this.router = TestBed.inject(Router);
    this.session = TestBed.inject(SessionService);
    this.harness = await RouterTestingHarness.create();
    await this.serve();
  }

  async restart(): Promise<void> {
    this.http.verify();
    TestBed.resetTestingModule();
    await this.start();
  }

  async open(url: string): Promise<void> {
    await this.harness.navigateByUrl(url);
    await this.serve();
  }

  /** Answers every pending request from the fake API until the app stops sending any. */
  async serve(): Promise<void> {
    await this.settle();
    for (let pending = this.http.match(() => true); pending.length;) {
      pending.forEach((req) => this.api.respond(req));
      await this.settle();
      pending = this.http.match(() => true);
    }
  }

  async settle(): Promise<void> {
    await this.harness.fixture.whenStable();
    this.harness.detectChanges();
  }

  get url(): string {
    return this.router.url;
  }

  /** The URL path without its query string. */
  get path(): string {
    return this.url.split('?')[0];
  }

  page(): HTMLElement {
    return this.harness.routeNativeElement as HTMLElement;
  }

  el<T extends HTMLElement>(selector: string): T {
    return this.page().querySelector(selector) as T;
  }

  text(selector: string): string {
    return this.el(selector)?.textContent?.trim() ?? '';
  }

  type(id: string, value: string): void {
    const input = this.el<HTMLInputElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    this.harness.detectChanges();
  }

  select(id: string, value: string): void {
    const select = this.el<HTMLSelectElement>(`#${id}`);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    this.harness.detectChanges();
  }

  async submit(): Promise<void> {
    this.el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    this.harness.detectChanges();
    await this.serve();
  }

  async click(selector: string): Promise<void> {
    this.el<HTMLElement>(selector).click();
    await this.serve();
  }

  /** Fills the sign-up form, waits for the availability checks, and submits. */
  async signUp({ username, email, password }: SignUpDetails): Promise<void> {
    await this.open('/register');
    this.type('username', username);
    this.type('email', email);
    this.type('password', password);
    this.type('confirmPassword', password);
    await this.waitForAvailabilityChecks();
    await this.submit();
  }

  async waitForAvailabilityChecks(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, AVAILABILITY_DEBOUNCE_MS + 20));
    await this.serve();
  }

  async logIn(identifier: string, password: string): Promise<void> {
    if (this.path !== '/login') await this.open('/login');
    this.type('identifier', identifier);
    this.type('password', password);
    await this.submit();
  }

  /** Log out lives in the dashboard's account menu. */
  async logOut(): Promise<void> {
    if (this.path !== '/home') await this.open('/home');
    await this.click('button.avatar');
    await this.click('button.logout');
  }

  storedToken(): string | null {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /** Calls GET /api/auth/me with a given token, e.g. one kept from before a logout or reset. */
  async meWith(token: string): Promise<number> {
    const result = firstValueFrom(
      TestBed.inject(HttpClient).get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ).then(
      () => 200,
      (error: { status: number }) => error.status,
    );
    await this.serve();
    return result;
  }
}

export function clearBrowserStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}
