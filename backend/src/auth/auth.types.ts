export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
}
