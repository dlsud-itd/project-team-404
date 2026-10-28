import { FakeAuthApi } from '../helpers/fake-auth-api';
import {
  REGRESSION_TIMEOUT_MS,
  RegressionApp,
  clearBrowserStorage,
} from '../helpers/regression-app';

/**
 * Profile Management regression (Sprint 1 baseline): log in → PATCH /profile → /me shows
 * the change → log in with the new username. Runs the whole app against a stateful fake of
 * the auth API.
 */

const USER = { username: 'james', email: 'james@example.com', password: 'james-password' };

describe('Profile Management regression', { timeout: REGRESSION_TIMEOUT_MS }, () => {
  let api: FakeAuthApi;
  let app: RegressionApp;

  beforeEach(async () => {
    clearBrowserStorage();
    api = new FakeAuthApi();
    app = new RegressionApp(api);
    await app.start();
    api.seed(USER);
    await app.logIn(USER.email, USER.password);
  });

  afterEach(() => app.http.verify());

  /** Opens profile settings from the account menu, as a user does. */
  async function openProfile(): Promise<void> {
    await app.click('button.avatar');
    await app.click('a.menu-link[href="/settings/profile"]');
    expect(app.url).toBe('/settings/profile');
  }

  it('changes the username, keeps it after a refresh, and logs in with it', async () => {
    await openProfile();
    expect(app.el<HTMLInputElement>('#profile-username').value).toBe('james');
    expect(app.el<HTMLSelectElement>('#profile-timezone').value).toBe('Asia/Manila');
    expect(app.el<HTMLInputElement>('#profile-email').readOnly).toBe(true);

    app.type('profile-username', 'james.r');
    await app.submit();

    expect(api.lastBody('PATCH /profile')).toEqual({ username: 'james.r' });
    expect(app.text('.form-notice[role="status"]')).toBe('Profile updated.');
    expect(app.el<HTMLInputElement>('#profile-username').value).toBe('james.r');

    // The dashboard shows the new name without asking the server again.
    const requests = api.log.length;
    await app.click('a.back');
    expect(app.text('.greeting')).toMatch(/, james\.r$/);
    expect(api.log.slice(requests)).not.toContain('GET /me');

    await app.restart();
    expect(api.log.at(-1)).toBe('GET /me');
    expect(app.session.currentUser()?.username).toBe('james.r');

    await app.logOut();
    await app.logIn('james', USER.password);
    expect(app.path).toBe('/login');

    app.type('identifier', 'james.r');
    app.type('password', USER.password);
    await app.submit();
    expect(app.url).toBe('/home');
    expect(app.text('.greeting')).toMatch(/, james\.r$/);
  });

  it('changes only the timezone and the new session sees it', async () => {
    await openProfile();
    app.select('profile-timezone', 'Europe/London');
    await app.submit();

    expect(api.lastBody('PATCH /profile')).toEqual({ timezone: 'Europe/London' });

    await app.logOut();
    await app.logIn(USER.email, USER.password);
    expect(app.session.currentUser()?.timezone).toBe('Europe/London');
    await app.open('/settings/profile');
    expect(app.el<HTMLSelectElement>('#profile-timezone').value).toBe('Europe/London');
  });

  it('keeps the profile unchanged when the new username is taken', async () => {
    api.seed({ username: 'maria', email: 'maria@example.com', password: 'maria-password' });
    await openProfile();

    app.type('profile-username', 'maria');
    await app.submit();

    expect(app.text('#profile-username-status')).toBe('Username already taken.');
    expect(api.account('james')).toBeTruthy();
    expect(app.session.currentUser()?.username).toBe('james');
  });

  it('sends the user to /login when the session ends before saving', async () => {
    await openProfile();
    api.revokeSessions(api.account('james')!);

    app.type('profile-username', 'james.r');
    await app.submit();

    expect(app.url).toBe('/login');
    expect(app.storedToken()).toBeNull();
    expect(api.account('james')).toBeTruthy();
  });
});
