# Landing Page Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID        | Test type   | Test file (repository-relative)                                           | Result | Coverage / notes                                                                                            |
| -------------- | ----------- | ------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| LANDING-01-T01 | Unit        | `frontend/src/app/features/landing/landing.spec.ts`                       | Pass   | checks section fragment links, Log in/Get Started destinations, hero content accessibility, and section IDs |
| LANDING-01-T02 | Integration | `frontend/tests/integration/features/landing/landing.integration.spec.ts` | Pass   | exercises landing route navigation and its primary links                                                    |

## Coverage Notes

The Landing page has no backend API or dedicated Playwright E2E/regression suite. Its account CTAs route to the Auth feature; signup/login coverage is in the Auth action docs.
