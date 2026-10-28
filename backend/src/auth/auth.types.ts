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

export interface SessionIdentity {
  sub: string;
}
