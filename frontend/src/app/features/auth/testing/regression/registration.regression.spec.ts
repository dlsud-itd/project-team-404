import { FakeAuthApi } from '../helpers/fake-auth-api';
import {
  REGRESSION_TIMEOUT_MS,
  RegressionApp,
  clearBrowserStorage,
} from '../helpers/regression-app';

/**
 * Registration regression (Sprint 1 baseline): sign up → log in → /me returns the new
 * user's Inbox project. Runs the whole app against a stateful fake of the auth API.
 */

const NEW_USER = { username: 'maria', email: 'maria@example.com', password: 'maria-password' };

describe('Registration regression', { timeout: REGRESSION_TIMEOUT_MS }, () => {
  let api: FakeAuthApi;
  let app: RegressionApp;

  beforeEach(async () => {
    clearBrowserStorage();
    api = new FakeAuthApi();
    app = new RegressionApp(api);
    await app.start();
  });

  afterEach(() => app.http.verify());

  it('signs up, logs in, and /me returns the new Inbox project after a refresh', async () => {
    await app.signUp(NEW_USER);

    expect(app.text('.success[role="status"]')).toContain('Account created');
    expect(app.storedToken()).toBeNull();
    const account = api.account('maria')!;
    expect(account.email).toBe('maria@example.com');

    await app.click('.success a[href="/login"]');
    expect(app.url).toBe('/login');

    await app.logIn(NEW_USER.email, NEW_USER.password);
    expect(app.url).toBe('/home');
    expect(app.text('.greeting')).toMatch(/, maria$/);

    await app.restart();
    expect(api.log.at(-1)).toBe('GET /me');
    const user = app.session.currentUser()!;
    expect(user.username).toBe('maria');
    expect(user.inboxProjectId).toBeGreaterThan(0);
    expect(user.inboxProjectId).toBe(account.inboxProjectId);

    await app.open('/home');
    expect(app.url).toBe('/home');
  });

  it('rejects a taken username, then signs up with a corrected one', async () => {
    api.seed({ username: 'maria', email: 'other@example.com', password: 'other-password' });

    await app.signUp(NEW_USER);
    expect(app.text('#username-status')).toBe('Username already taken.');
    expect(api.log).not.toContain('POST /signup');

    app.type('username', 'maria.santos');
    await app.waitForAvailabilityChecks();
    expect(app.text('#username-status')).not.toContain('taken');
    await app.submit();

    expect(app.el('.success[role="status"]')).toBeTruthy();
    await app.click('.success a[href="/login"]');
    await app.logIn('maria.santos', NEW_USER.password);
    expect(app.url).toBe('/home');
  });

  it('shows the 409 on the email field when the email is registered between check and submit', async () => {
    await app.open('/register');
    app.type('username', NEW_USER.username);
    app.type('email', NEW_USER.email);
    app.type('password', NEW_USER.password);
    app.type('confirmPassword', NEW_USER.password);
    await app.waitForAvailabilityChecks();

    // Someone else takes the email after the availability check passed.
    api.seed({ username: 'someone', email: NEW_USER.email, password: 'someone-password' });
    await app.submit();

    expect(app.text('#email-status')).toBe('Email already registered.');
    expect(app.el<HTMLInputElement>('#username').value).toBe(NEW_USER.username);
    expect(app.url).toBe('/register');
    expect(app.storedToken()).toBeNull();
  });
});
