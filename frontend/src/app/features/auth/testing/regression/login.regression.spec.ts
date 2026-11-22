import { FakeAuthApi } from '../helpers/fake-auth-api';
import {
  REGRESSION_TIMEOUT_MS,
  RegressionApp,
  clearBrowserStorage,
} from '../helpers/regression-app';

/**
 * Login & Session regression (Sprint 1 baseline): sign up → log in → /me → log out →
 * the old token gets 401 from /me. Runs the whole app against a stateful fake of the auth API.
 */

const USER = { username: 'james', email: 'james@example.com', password: 'james-password' };

describe('Login & Session regression', { timeout: REGRESSION_TIMEOUT_MS }, () => {
  let api: FakeAuthApi;
  let app: RegressionApp;

  beforeEach(async () => {
    clearBrowserStorage();
    api = new FakeAuthApi();
    app = new RegressionApp(api);
    await app.start();
  });

  afterEach(() => app.http.verify());

  it('signs up, logs in, restores the session, logs out, and the old token gets 401', async () => {
    await app.signUp(USER);
    await app.logIn(USER.email, USER.password);
    expect(app.url).toBe('/home');
    const token = app.storedToken()!;
    expect(api.isSessionActive(token)).toBe(true);

    await app.restart();
    expect(app.session.currentUser()?.username).toBe('james');
    await app.open('/home');
    expect(app.url).toBe('/home');

    await app.logOut();
    expect(app.url).toBe('/login');
    expect(app.storedToken()).toBeNull();
    expect(app.session.currentUser()).toBeNull();
    expect(api.isSessionActive(token)).toBe(false);
    expect(await app.meWith(token)).toBe(401);

    // Going back to a protected page after logout lands on /login again.
    await app.open('/home');
    expect(app.url).toBe('/login');

    // A refresh does not bring the session back.
    const requests = api.log.length;
    await app.restart();
    expect(api.log.slice(requests)).toEqual([]);
    expect(app.session.currentUser()).toBeNull();
  });

  it('logs in with the username as well as the email', async () => {
    api.seed(USER);

    await app.logIn('james', USER.password);
    expect(app.url).toBe('/home');
    expect(app.session.currentUser()?.email).toBe(USER.email);
  });

  it('rejects a wrong password with the generic message, then accepts the right one', async () => {
    api.seed(USER);

    await app.logIn(USER.email, 'wrong-password');
    expect(app.url).toBe('/login');
    expect(app.text('[role="alert"]')).toContain('Incorrect email/username or password.');
    expect(app.el<HTMLInputElement>('#password').value).toBe('');
    expect(app.storedToken()).toBeNull();

    app.type('password', USER.password);
    await app.submit();
    expect(app.url).toBe('/home');
  });

  it('sends the user to /login when the server revokes the session', async () => {
    const account = api.seed(USER);
    await app.logIn(USER.email, USER.password);
    const token = app.storedToken()!;

    // The session is ended elsewhere (e.g. a password reset on another device).
    api.revokeSessions(account);
    await app.open('/settings/profile');

    expect(app.url).toBe('/login');
    expect(app.storedToken()).toBeNull();
    expect(api.isSessionActive(token)).toBe(false);
  });
});
