# Landing Page Tests

## Direct Coverage

### Frontend Unit

`frontend/src/app/features/landing/landing.spec.ts` checks section fragment links, Log in/Get Started destinations, hero content accessibility, and section IDs.

### Frontend Integration

`frontend/tests/integration/features/landing/landing.integration.spec.ts` exercises landing route navigation and its primary links.

### Backend, E2E, and Regression

The Landing page has no backend API or dedicated Playwright E2E/regression suite. Its account CTAs route to the Auth feature; signup/login coverage is in the Auth action docs.
