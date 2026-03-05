/**
 * Generic response wrapper
 */
export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data?: T,
    public statusCode: number = 200,
    public errors?: any,
  ) {}
}

/**
 * Auth response DTO
 */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    username: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
  };
  expiresIn: number; // in seconds
}

/**
 * User response DTO
 */
export class UserResponseDto {
  userId: string;
  username: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
}
