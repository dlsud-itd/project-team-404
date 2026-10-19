import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SignupRequest = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  timezone: string;
};

export type SignupResponse = {
  userId: string;
  inboxProjectId: number;
};

export type AvailabilityResponse = {
  available: boolean;
};

export type MessageResponse = {
  message: string;
};

export type ResetTokenResponse = {
  valid: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;

  signup(payload: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.baseUrl}/signup`, payload);
  }

  checkUsername(username: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(
      `${this.baseUrl}/check-username/${encodeURIComponent(username)}`,
    );
  }

  checkEmail(email: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(
      `${this.baseUrl}/check-email/${encodeURIComponent(email)}`,
    );
  }

  requestPasswordReset(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/forgot-password`, {
      email,
    });
  }

  validateResetToken(token: string): Observable<ResetTokenResponse> {
    return this.http.get<ResetTokenResponse>(`${this.baseUrl}/validate-reset-token`, {
      params: { token },
    });
  }

  resetPassword(token: string, password: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/reset-password`, {
      token,
      newPassword: password,
      confirmPassword: password,
    });
  }
}
