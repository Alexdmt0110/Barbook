import { Request } from 'express';
import { AuthResponse, SessionIdentity } from './auth.types';

export interface AuthenticatedRequest extends Request {
  auth?: SessionIdentity;
  sessionContext?: AuthResponse;
}
