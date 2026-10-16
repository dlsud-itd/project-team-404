export type HttpClientMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MockHttpResponse<T = unknown> = {
  status: number;
  ok?: boolean;
  body: T;
  headers?: Record<string, string>;
};

export type HttpClientRequest = {
  method: HttpClientMethod;
  url: string;
  body?: unknown;
};

export type HttpClientMock<T = unknown> = {
  requests: HttpClientRequest[];
  response: MockHttpResponse<T>;
  setResponse: (response: MockHttpResponse<T>) => HttpClientMock<T>;
  request: (method: HttpClientMethod, url: string, body?: unknown) => Promise<MockHttpResponse<T>>;
  get: (url: string) => Promise<MockHttpResponse<T>>;
  post: (url: string, body?: unknown) => Promise<MockHttpResponse<T>>;
  put: (url: string, body?: unknown) => Promise<MockHttpResponse<T>>;
  patch: (url: string, body?: unknown) => Promise<MockHttpResponse<T>>;
  delete: (url: string, body?: unknown) => Promise<MockHttpResponse<T>>;
  reset: () => HttpClientMock<T>;
};

export function createHttpClientMock<T = unknown>(
  initialResponse: MockHttpResponse<T> = {
    status: 200,
    ok: true,
    body: undefined as T,
    headers: {},
  },
): HttpClientMock<T> {
  const requests: HttpClientRequest[] = [];

  let response = { ...initialResponse, headers: { ...(initialResponse.headers ?? {}) } };

  const api: HttpClientMock<T> = {
    requests,
    response,
    setResponse(nextResponse: MockHttpResponse<T>) {
      response = { ...nextResponse, headers: { ...(nextResponse.headers ?? {}) } };
      api.response = response;
      return api;
    },
    async request(method: HttpClientMethod, url: string, body?: unknown) {
      requests.push({ method, url, body });

      const nextResponse = {
        ...response,
        ok: response.ok ?? (response.status >= 200 && response.status < 300),
      };

      return Promise.resolve(nextResponse);
    },
    async get(url: string) {
      return api.request('GET', url);
    },
    async post(url: string, body?: unknown) {
      return api.request('POST', url, body);
    },
    async put(url: string, body?: unknown) {
      return api.request('PUT', url, body);
    },
    async patch(url: string, body?: unknown) {
      return api.request('PATCH', url, body);
    },
    async delete(url: string, body?: unknown) {
      return api.request('DELETE', url, body);
    },
    reset() {
      requests.length = 0;
      response = { ...initialResponse, headers: { ...(initialResponse.headers ?? {}) } };
      api.response = response;
      return api;
    },
  };

  api.response = response;

  return api;
}
