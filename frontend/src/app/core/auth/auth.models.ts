export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  workspaceId: string;
  csrfToken: string;
}

export interface LoginRequest {
  rememberMe?: boolean;
  email: string;
  password: string;
}

export const AUTH_SNAPSHOT = new HttpContextToken<AuthResponse | null>(() => null);

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}
import { HttpContextToken } from '@angular/common/http';
