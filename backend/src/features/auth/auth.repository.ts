import {
  AuthConflictError,
  SupabaseAuthConfigurationError,
  SupabaseAuthRequestError,
} from './auth.errors';
import type { SignupInput } from './auth.schemas';

export type SignupResult = {
  userId: string;
  inboxProjectId: number;
};

export interface AuthRepository {
  isUsernameAvailable(username: string): Promise<boolean>;
  isEmailAvailable(email: string): Promise<boolean>;
  createUser(input: SignupInput): Promise<SignupResult>;
}

type SupabaseUser = {
  id: string;
};

type ProjectRecord = {
  project_id: number;
};

export class SupabaseAuthRepository implements AuthRepository {
  constructor(
    private readonly supabaseUrl?: string,
    private readonly serviceRoleKey?: string,
  ) {}

  async isUsernameAvailable(username: string): Promise<boolean> {
    const rows = await this.restRequest<{ user_id: string }[]>('tbl_user', {
      select: 'user_id',
      username: `eq.${username}`,
      limit: '1',
    });
    return rows.length === 0;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const rows = await this.restRequest<{ user_id: string }[]>('tbl_user', {
      select: 'user_id',
      email: `eq.${email}`,
      limit: '1',
    });
    return rows.length === 0;
  }

  async createUser(input: SignupInput): Promise<SignupResult> {
    let user: SupabaseUser;
    try {
      user = await this.authRequest<SupabaseUser>('admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: { username: input.username },
        }),
      });
    } catch (error) {
      if (error instanceof SupabaseAuthRequestError && this.isEmailConflict(error)) {
        throw new AuthConflictError('Email is already in use');
      }
      throw error;
    }

    try {
      await this.restRequest('tbl_user', undefined, {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          username: input.username,
          email: input.email,
          timezone: input.timezone,
        }),
        headers: { Prefer: 'return=minimal' },
      });

      const [inbox] = await this.restRequest<ProjectRecord[]>('tbl_project', undefined, {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          name: 'Inbox',
          is_inbox: true,
        }),
        headers: { Prefer: 'return=representation' },
      });

      if (!inbox) {
        throw new Error('Supabase did not return the created Inbox project');
      }

      return { userId: user.id, inboxProjectId: inbox.project_id };
    } catch (error) {
      try {
        await this.authRequest(`admin/users/${encodeURIComponent(user.id)}`, {
          method: 'DELETE',
        });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Signup failed and the created Supabase Auth user could not be removed',
        );
      }

      if (error instanceof SupabaseAuthRequestError && this.isUniqueConflict(error)) {
        const message = this.conflictMessage(error);
        throw new AuthConflictError(message);
      }
      throw error;
    }
  }

  private async restRequest<T = unknown>(
    table: string,
    query?: Record<string, string>,
    init: RequestInit = {},
  ): Promise<T> {
    const url = this.endpoint(`rest/v1/${table}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, value);
    }

    return this.request<T>(url, init, 'Supabase database request');
  }

  private async authRequest<T = unknown>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    return this.request<T>(
      this.endpoint(`auth/v1/${path}`),
      init,
      'Supabase Auth request',
    );
  }

  private async request<T>(
    url: URL,
    init: RequestInit,
    operation: string,
  ): Promise<T> {
    const key = this.getServiceRoleKey();
    const response = await fetch(url, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new SupabaseAuthRequestError(
          `${operation} returned an invalid JSON response`,
          response.status,
          text,
        );
      }
    }

    if (!response.ok) {
      throw new SupabaseAuthRequestError(
        `${operation} failed with status ${response.status}`,
        response.status,
        payload,
      );
    }
    return payload as T;
  }

  private endpoint(path: string): URL {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new SupabaseAuthConfigurationError();
    }
    return new URL(path, `${this.supabaseUrl.replace(/\/+$/, '')}/`);
  }

  private getServiceRoleKey(): string {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new SupabaseAuthConfigurationError();
    }
    return this.serviceRoleKey;
  }

  private isUniqueConflict(error: SupabaseAuthRequestError): boolean {
    if (error.status !== 409) {
      return false;
    }
    const details = error.details;
    return (
      typeof details === 'object' &&
      details !== null &&
      'code' in details &&
      details.code === '23505'
    );
  }

  private isEmailConflict(error: SupabaseAuthRequestError): boolean {
    if (error.status !== 400 && error.status !== 422) {
      return false;
    }
    const details = error.details;
    if (typeof details !== 'object' || details === null) {
      return false;
    }
    return (
      ('code' in details &&
        (details.code === 'email_exists' || details.code === 'user_already_exists')) ||
      ('msg' in details &&
        typeof details.msg === 'string' &&
        details.msg.toLowerCase().includes('already been registered'))
    );
  }

  private conflictMessage(error: SupabaseAuthRequestError): string {
    const details = error.details;
    if (
      typeof details === 'object' &&
      details !== null &&
      'message' in details &&
      typeof details.message === 'string'
    ) {
      if (details.message.includes('tbl_user_username')) {
        return 'Username is already in use';
      }
      if (details.message.includes('tbl_user_email')) {
        return 'Email is already in use';
      }
    }
    return 'Username or email is already in use';
  }
}
