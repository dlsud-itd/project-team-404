export type MockRequestOptions = {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export function mockRequest(options: MockRequestOptions = {}) {
  const method = options.method ?? 'GET';
  const path = options.path ?? '/';

  return {
    method,
    path,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body,
    query: options.query ?? {},
  };
}
