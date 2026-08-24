export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}
