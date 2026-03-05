/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Auth response interface
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

/**
 * User response interface
 */
export interface UserResponse {
  userId: string;
  username: string;
  email: string;
  name: string | null;
  createdAt: string;
  phone?: string | null;
  avatarUrl?: string | null;
}
