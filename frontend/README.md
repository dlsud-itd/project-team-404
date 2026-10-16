# Frontend

This Angular application runs at `http://localhost:4200`.
It is built as a browser-only single-page application. For Vercel, use
`frontend` as the project root and `dist/frontend/browser` as the output
directory; `vercel.json` serves the app shell for client-side routes such as
`/register`.

## Local setup

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

Replace the example values in `.env` with the Supabase project URL and
publishable key, and the backend API base URL. These `NG_APP_` values are
public: they are compiled into the browser application. Do not put secrets in
this file.

Angular does not load `.env` files at runtime. The `set-env` script generates
`src/environments/environment.generated.ts` before `start`, `build`, `watch`,
and `test`; the generated file is gitignored. On hosted builds, provide the
same `NG_APP_` variables through the hosting environment.

## Build and test

```powershell
npm run build
npm test
```
