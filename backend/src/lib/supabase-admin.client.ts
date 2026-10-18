import { env } from '../config/env';
import {
  SupabaseAuthConfigurationError,
  SupabaseAuthRequestError,
} from '../features/auth/shared/errors/auth.error';

type SupabaseAuthUser = { id: string };

export class SupabaseAdminClient {
  async createUser(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<SupabaseAuthUser> {
    return this.authRequest<SupabaseAuthUser>('admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { username: input.username },
      }),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.authRequest(`admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async verifyCredentials(email: string, password: string): Promise<void> {
    await this.authRequest('token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    await this.authRequest(`admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  private async authRequest<T = unknown>(
    path: string,
    init: RequestInit
  ): Promise<T> {
    const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env;
    if (!url || !key) {
      throw new SupabaseAuthConfigurationError();
    }
    const response = await fetch(
      new URL(`auth/v1/${path}`, `${url.replace(/\/+$/, '')}/`),
      {
        ...init,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      }
    );
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new SupabaseAuthRequestError(
          'Supabase Auth returned invalid JSON',
          response.status,
          text
        );
      }
    }
    if (!response.ok) {
      throw new SupabaseAuthRequestError(
        `Supabase Auth failed with status ${response.status}`,
        response.status,
        payload
      );
    }
    return payload as T;
  }
}

export const supabaseAdmin = new SupabaseAdminClient();
