import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideSessionRestore } from './features/auth/session/auth.guards';
import { authInterceptor } from './features/auth/session/auth.interceptor';
import { providePriorityLevels } from './features/settings/state/priorities.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideSessionRestore(),
    providePriorityLevels(),
  ],
};
