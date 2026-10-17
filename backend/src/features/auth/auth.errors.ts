export class AuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export class SupabaseAuthConfigurationError extends Error {
  constructor() {
    super('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
    this.name = 'SupabaseAuthConfigurationError';
  }
}

export class SupabaseAuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown
  ) {
    super(message);
    this.name = 'SupabaseAuthRequestError';
  }
}

export class AuthUnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthUnauthorizedError';
  }
}
