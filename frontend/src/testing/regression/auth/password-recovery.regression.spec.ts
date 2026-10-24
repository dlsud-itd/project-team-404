import { FakeAuthApi } from '../helpers/fake-auth-api';
import {
  REGRESSION_TIMEOUT_MS,
  RegressionApp,
  clearBrowserStorage,
} from '../helpers/regression-app';

/**
 * Password Recovery regression (Sprint 1 baseline): request a reset → read the stub email →
 * reset → old sessions get 401, the old password fails and the new one works. Sign-up and
 * login must still pass after a reset. Runs the whole app against a stateful fake of the API.
 */

const USER = { username: 'james', email: 'james@example.com', password: 'old-password' };
const NEW_PASSWORD = 'new-password-123';

describe('Password Recovery regression', { timeout: REGRESSION_TIMEOUT_MS }, () => {
  let api: FakeAuthApi;
  let app: RegressionApp;

  beforeEach(async () => {
    clearBrowserStorage();
    api = new FakeAuthApi();
    app = new RegressionApp(api);
    await app.start();
  });

  afterEach(() => app.http.verify());

  /** Opens a reset link from the stub outbox (the newest by default) in a fresh page load. */
  async function openEmailedLink(link = api.outbox.at(-1)!.link): Promise<void> {
    const { pathname, search } = new URL(link);
    await app.restart();
    await app.open(`${pathname}${search}`);
  }

  async function requestReset(email: string): Promise<void> {
    // Navigating to the page already shown does nothing, so leave it first.
    if (app.path === '/forgot-password') await app.open('/');
    await app.open('/forgot-password');
    app.type('email', email);
    await app.submit();
  }

  async function setNewPassword(password: string): Promise<void> {
    app.type('password', password);
    app.type('confirmation', password);
    await app.submit();
  }

  it('resets the password, ends old sessions, and only the new password logs in', async () => {
    const account = api.seed(USER);
    const otherDevice = api.createSession(account);

    await requestReset(USER.email);
    expect(app.text('[role="status"]')).toContain('Check your inbox.');
    expect(api.outbox).toHaveLength(1);
    expect(api.outbox[0].to).toBe(USER.email);

    await openEmailedLink();
    expect(app.el('form')).toBeTruthy();
    await setNewPassword(NEW_PASSWORD);

    expect(app.url).toBe('/login?reset=success');
    expect(app.text('.form-notice[role="status"]')).toBe(
      'Your password has been updated. Log in with your new password.',
    );
    expect(api.isSessionActive(otherDevice)).toBe(false);
    expect(await app.meWith(otherDevice)).toBe(401);

    await app.logIn(USER.email, USER.password);
    expect(app.path).toBe('/login');
    expect(app.text('.form-error[role="alert"]')).toContain(
      'Incorrect email/username or password.',
    );

    app.type('password', NEW_PASSWORD);
    await app.submit();
    expect(app.url).toBe('/home');
    expect(app.session.currentUser()?.username).toBe('james');
  });

  it('clears the session stored in this browser when the reset succeeds', async () => {
    api.seed(USER);
    await app.logIn(USER.email, USER.password);
    const token = app.storedToken()!;

    await requestReset(USER.email);
    await openEmailedLink();
    await setNewPassword(NEW_PASSWORD);

    expect(app.storedToken()).toBeNull();
    expect(app.session.currentUser()).toBeNull();
    expect(api.isSessionActive(token)).toBe(false);

    await app.open('/home');
    expect(app.url).toBe('/login');
  });

  it('shows the used-link message when the same reset link is opened again', async () => {
    api.seed(USER);
    await requestReset(USER.email);
    await openEmailedLink();
    await setNewPassword(NEW_PASSWORD);

    await openEmailedLink();
    expect(app.el('form')).toBeNull();
    expect(app.el('.token-status a').getAttribute('href')).toBe('/forgot-password');
  });

  it('only the newest link works when two resets are requested', async () => {
    api.seed(USER);
    await requestReset(USER.email);
    const first = api.outbox[0].link;
    await requestReset(USER.email);

    await openEmailedLink(first);
    expect(app.el('form')).toBeNull();

    await openEmailedLink();
    expect(app.el('form')).toBeTruthy();
  });

  it('shows the same confirmation for an unknown email and sends no email', async () => {
    await requestReset('nobody@example.com');

    expect(app.text('[role="status"]')).toContain('Check your inbox.');
    expect(api.outbox).toHaveLength(0);
  });

  it('still signs up and logs in new users after a reset', async () => {
    api.seed(USER);
    await requestReset(USER.email);
    await openEmailedLink();
    await setNewPassword(NEW_PASSWORD);

    const newcomer = { username: 'ana', email: 'ana@example.com', password: 'ana-password' };
    await app.signUp(newcomer);
    expect(app.el('.success[role="status"]')).toBeTruthy();
    await app.logIn(newcomer.username, newcomer.password);
    expect(app.url).toBe('/home');
    expect(app.session.currentUser()?.inboxProjectId).toBeGreaterThan(0);

    await app.logOut();
    await app.logIn(USER.username, NEW_PASSWORD);
    expect(app.url).toBe('/home');
  });
});
