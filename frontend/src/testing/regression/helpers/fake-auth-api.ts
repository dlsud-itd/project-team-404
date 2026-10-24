import type { TestRequest } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';

export const API = `${environment.apiBaseUrl}/api/auth`;

export type Account = {
  id: string;
  username: string;
  email: string;
  password: string;
  timezone: string;
  inboxProjectId: number;
};

/** A reset email the fake backend "sent", like the stub email transport in development. */
export type SentEmail = { to: string; link: string };

type Reply = { status: number; body: object };

const ok = (body: object): Reply => ({ status: 200, body });
const fail = (status: number, body: object): Reply => ({ status, body });
const UNAUTHORIZED = fail(401, { error: 'Unauthorized' });
const TOKEN_REJECTED = fail(401, { error: 'Token invalid or expired' });

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  409: 'Conflict',
};

/**
 * An in-memory stand-in for the Sprint 1 auth API (backend/src/features/auth). It keeps
 * accounts, session tokens and reset tokens between requests, so a regression flow sees the
 * same effects the real backend has: a reset revokes every session, logout revokes one, a
 * profile change is returned by later /me calls. Bodies and status codes match the backend.
 */
export class FakeAuthApi {
  /** Every reset email sent, newest last. */
  readonly outbox: SentEmail[] = [];
  /** Every request answered, in order, as "METHOD /path" with its body. */
  readonly received: { route: string; body: unknown }[] = [];

  private readonly accounts: Account[] = [];
  private readonly sessions = new Map<string, string>();
  private readonly resetTokens = new Map<string, { userId: string; used: boolean }>();
  private nextId = 1;

  /** Adds an account directly, as the seed script does. */
  seed(details: Pick<Account, 'username' | 'email' | 'password'> & { timezone?: string }): Account {
    const id = this.nextId++;
    const account: Account = {
      timezone: 'Asia/Manila',
      ...details,
      id: `user-${id}`,
      inboxProjectId: 100 + id,
    };
    this.accounts.push(account);
    return account;
  }

  /** Signs an account in without the UI, e.g. a session on another device. */
  createSession(account: Account): string {
    const token = `session-${account.id}-${this.sessions.size + 1}-${Math.random().toString(36).slice(2)}`;
    this.sessions.set(token, account.id);
    return token;
  }

  account(username: string): Account | undefined {
    return this.accounts.find((a) => a.username === username);
  }

  /** Ends every session of an account. */
  revokeSessions(account: Account): void {
    for (const [token, userId] of this.sessions) {
      if (userId === account.id) this.sessions.delete(token);
    }
  }

  /** "METHOD /path" of every request answered, in order. */
  get log(): string[] {
    return this.received.map(({ route }) => route);
  }

  /** Body of the last request to a route such as "PATCH /profile". */
  lastBody(route: string): unknown {
    return this.received.filter((r) => r.route === route).at(-1)?.body;
  }

  isSessionActive(token: string): boolean {
    return this.sessions.has(token);
  }

  respond(req: TestRequest): void {
    const { method, url } = req.request;
    if (!url.startsWith(API)) throw new Error(`FakeAuthApi: unexpected request ${method} ${url}`);
    const path = url.slice(API.length);
    this.received.push({ route: `${method} ${path}`, body: req.request.body });

    const reply = this.route(req, method, path);
    req.flush(reply.body, {
      status: reply.status,
      statusText: STATUS_TEXT[reply.status] ?? 'Error',
    });
  }

  private route(req: TestRequest, method: string, path: string): Reply {
    const body = (req.request.body ?? {}) as Record<string, string>;
    const user = this.userFor(req);

    if (method === 'GET' && path.startsWith('/check-username/')) {
      const username = decodeURIComponent(path.slice('/check-username/'.length));
      return ok({ available: !this.account(username), username });
    }
    if (method === 'GET' && path.startsWith('/check-email/')) {
      const email = decodeURIComponent(path.slice('/check-email/'.length));
      return ok({ available: !this.byEmail(email), email });
    }

    switch (`${method} ${path}`) {
      case 'POST /signup':
        return this.signup(body);
      case 'POST /login':
        return this.login(body);
      case 'GET /me':
        return user ? ok(this.publicUser(user)) : TOKEN_REJECTED;
      case 'POST /logout': {
        const token = this.bearer(req);
        if (!token || !this.sessions.delete(token)) return UNAUTHORIZED;
        return ok({ message: 'Logged out successfully' });
      }
      case 'POST /forgot-password':
        return this.forgotPassword(body);
      case 'GET /validate-reset-token':
        return this.validateResetToken(req.request.params.get('token') ?? '');
      case 'POST /reset-password':
        return this.resetPassword(body);
      case 'GET /profile':
        return user ? ok(this.profile(user)) : TOKEN_REJECTED;
      case 'PATCH /profile':
        return user ? this.updateProfile(user, body) : TOKEN_REJECTED;
    }
    throw new Error(`FakeAuthApi: no route for ${method} ${path}`);
  }

  private signup(body: Record<string, string>): Reply {
    if (this.account(body['username'])) return fail(409, { error: 'Username is already in use' });
    if (this.byEmail(body['email'])) return fail(409, { error: 'Email is already in use' });
    const account = this.seed({
      username: body['username'],
      email: body['email'].toLowerCase(),
      password: body['password'],
      timezone: body['timezone'],
    });
    return { status: 201, body: { userId: account.id, inboxProjectId: account.inboxProjectId } };
  }

  private login({ identifier, password }: Record<string, string>): Reply {
    const account = this.byEmail(identifier) ?? this.account(identifier);
    if (!account || account.password !== password) {
      return fail(401, { error: 'Invalid email or password' });
    }
    return ok({ token: this.createSession(account), user: this.publicUser(account) });
  }

  private forgotPassword({ email }: Record<string, string>): Reply {
    const account = this.byEmail(email);
    if (account) {
      // A new link replaces any earlier one.
      for (const entry of this.resetTokens.values()) {
        if (entry.userId === account.id) entry.used = true;
      }
      const token = `reset+${account.id}/${this.resetTokens.size + 1}=`;
      this.resetTokens.set(token, { userId: account.id, used: false });
      this.outbox.push({
        to: account.email,
        link: `http://localhost:4200/reset-password?token=${encodeURIComponent(token)}`,
      });
    }
    return ok({ message: 'If an account exists for that email, a reset link has been sent.' });
  }

  private validateResetToken(token: string): Reply {
    const entry = this.resetTokens.get(token);
    if (!entry) return fail(400, { error: 'Reset token is invalid', reason: 'invalid' });
    if (entry.used) return fail(400, { error: 'Reset token is invalid', reason: 'used' });
    return ok({ valid: true });
  }

  private resetPassword({ token, newPassword, confirmPassword }: Record<string, string>): Reply {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.used || newPassword !== confirmPassword) {
      return fail(400, { error: 'This reset link is invalid or has expired.' });
    }
    entry.used = true;
    const account = this.accounts.find((a) => a.id === entry.userId)!;
    account.password = newPassword;
    // Like revoke-user-sessions.query.ts: every existing session ends.
    this.revokeSessions(account);
    return ok({ message: 'Password updated successfully.' });
  }

  private updateProfile(account: Account, changes: Record<string, string>): Reply {
    const username = changes['username']?.trim();
    if (username !== undefined && username !== account.username && this.account(username)) {
      return fail(409, { error: 'Username is already in use' });
    }
    if (username !== undefined) account.username = username;
    if (changes['timezone'] !== undefined) account.timezone = changes['timezone'];
    return ok(this.profile(account));
  }

  private userFor(req: TestRequest): Account | undefined {
    const token = this.bearer(req);
    const userId = token ? this.sessions.get(token) : undefined;
    return this.accounts.find((a) => a.id === userId);
  }

  private bearer(req: TestRequest): string | null {
    return req.request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null;
  }

  private byEmail(email: string | undefined): Account | undefined {
    return this.accounts.find((a) => a.email === email?.toLowerCase());
  }

  private profile({ id, username, timezone }: Account) {
    return { id, username, timezone };
  }

  private publicUser({ id, username, email, timezone, inboxProjectId }: Account) {
    return { id, username, email, timezone, inboxProjectId };
  }
}
