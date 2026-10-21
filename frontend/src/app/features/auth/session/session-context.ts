import { HttpContextToken } from '@angular/common/http';

/** Set on requests whose 401 means something else (wrong password, logout, session restore). */
export const SKIP_SESSION_EXPIRY = new HttpContextToken<boolean>(() => false);
