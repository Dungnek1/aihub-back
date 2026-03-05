import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

/**
 * DTO for user signup
 */
export class SignUpDto {
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscore, and hyphen',
  })
  username: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;

  @IsString({ message: 'Full name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  name?: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;

  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  avatarUrl?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @IsString({ message: 'Username or email must be a string' })
  @MinLength(3, { message: 'Username or email must be at least 3 characters' })
  usernameOrEmail: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

/**
 * DTO for refresh token
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @MinLength(10, { message: 'Invalid refresh token' })
  refreshToken: string;
}

/**
 * DTO for change password
 */
export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @MinLength(6, { message: 'Current password must be at least 6 characters' })
  currentPassword: string;

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(50, { message: 'New password must not exceed 50 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  newPassword: string;

  @IsString({ message: 'Confirm password must be a string' })
  confirmPassword: string;
}

/**
 * DTO for password reset request
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @IsString({ message: 'Token must be a string' })
  token: string;

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(50, { message: 'New password must not exceed 50 characters' })
  newPassword: string;
}

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @IsString({ message: 'Full name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  name?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;

  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  avatarUrl?: string;
}

/**
 * DTO for OAuth login
 */
export class OAuthLoginDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  avatarUrl?: string;

  @IsString({ message: 'Provider must be a string' })
  provider: string;

  @IsString({ message: 'Provider user ID must be a string' })
  providerUserId: string;
}
