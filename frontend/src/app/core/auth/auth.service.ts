import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser, AuthResponse, LoginRequest, RegisterRequest } from './auth.models';

const ACCESS_TOKEN_STORAGE_KEY = 'barbook.accessToken';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<AuthenticatedUser | null>(null);
  private readonly accessTokenSignal = signal<string | null>(
    sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  );

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(
    () => this.currentUserSignal() !== null && this.accessTokenSignal() !== null,
  );

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', request)
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', request)
      .pipe(tap((response) => this.persistSession(response)));
  }

  loadCurrentUser(): Observable<AuthenticatedUser> {
    return this.http
      .get<AuthenticatedUser>('/api/auth/me')
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.accessTokenSignal.set(null);
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  hasStoredAccessToken(): boolean {
    return this.accessTokenSignal() !== null;
  }

  private persistSession(response: AuthResponse): void {
    this.currentUserSignal.set(response.user);
    this.accessTokenSignal.set(response.accessToken);

    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
  }
}
