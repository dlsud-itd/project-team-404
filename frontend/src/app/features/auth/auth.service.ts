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
}
