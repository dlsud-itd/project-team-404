# 01. Visit Landing and Choose an Auth Action

## In simple terms

Signed-out visitors see the Landing page. They can jump to a section, go to Log in, or start registration. Both account links route into the Auth feature; the Landing page itself does not call a backend API.

## Flowchart

```mermaid
flowchart TD
    A[Signed-out visitor opens /] --> B[guestGuard allows Landing]
    B --> C{Visitor choice}
    C -- Section link --> D[Scroll to Features, How it works, or About]
    C -- Log in --> E[/login]
    C -- Get Started --> F[/register]
    E --> G[Auth feature]
    F --> G
```

## Data flow walkthrough

Each numbered item describes one file. Comments explain public routing and the page's navigation links.

### 1. `frontend/src/app/app.routes.ts`

```ts
{
  path: '',
  pathMatch: 'full',
  // The guest guard sends signed-in visitors to the signed-in landing route instead.
  canActivate: [guestGuard],
  loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
}
```

### 2. `frontend/src/app/features/landing/landing.html`

```html
<!-- Header links jump to sections or route to the Auth pages. -->
<a routerLink="/login">Log in</a>
<a routerLink="/register">Get Started</a>
<a routerLink="/register">Create free account</a>
```

### 3. `frontend/src/app/features/landing/landing.ts`

```ts
// These section IDs are used by the fragment links in the Landing template.
protected readonly navLinks = [
  { label: 'Features', fragment: 'features' },
  { label: 'How it works', fragment: 'how-it-works' },
  { label: 'About', fragment: 'about' },
];
```

The Landing feature is frontend-only; login and signup behavior is documented under Auth. See [tests.md](tests.md).
