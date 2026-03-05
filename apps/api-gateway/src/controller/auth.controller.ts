import { Controller, Post, Get, Body, UseGuards, Put, Param, Delete } from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser, Public, ResponseMessage } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly apiGateway: ApiGatewayService) { }

  @Post('signup')
  @Public()
  @ResponseMessage('User registered successfully')
  @ApiOperation({ summary: 'Register a new user', operationId: 'signup' })
  @ApiBody({
    description: 'Sign up credentials',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, example: 'johndoe' },
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        password: { type: 'string', minLength: 8, example: '123456@Aa' },
        name: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+1234567890' },
        avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
      },
      required: ['username', 'email', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async signup(@Body() body: unknown): Promise<unknown> {
    const data: any = await this.apiGateway.forwardToService('AUTH', 'auth.signup', body);


    if (data && data.user) {
      console.log('Sending verification email for user:', data.user);
      await this.apiGateway.forwardToService('NOTIFICATION', 'auth.user.registered', {
        userId: data.user.userId,
        email: data.user.email,
        username: data.user.username,
      }).catch(err => {
        // Log error but don't fail the signup
        console.error('Failed to send verification email:', err);
      });
    }

    return data;
  }

  @Post('admin/login')
  @Public()
  @ApiOperation({ summary: 'Login admin/support user', operationId: 'adminLogin' })
  @ApiBody({
    description: 'Admin login credentials',
    schema: {
      type: 'object',
      properties: {
        usernameOrEmail: { type: 'string', example: 'admin' },
        password: { type: 'string', example: '123456@Aa' },
      },
      required: ['usernameOrEmail', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Admin login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or insufficient privileges' })
  async adminLogin(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'admin.login', body);
  }

  @Post('user/login')
  @Public()
  @ApiOperation({ summary: 'Login regular user', operationId: 'userLogin' })
  @ApiBody({
    description: 'User login credentials',
    schema: {
      type: 'object',
      properties: {
        usernameOrEmail: { type: 'string', example: 'alice' },
        password: { type: 'string', example: '123456@Aa' },
      },
      required: ['usernameOrEmail', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'User login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or insufficient privileges' })
  async userLogin(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'user.login', body);
  }

  @Post('refresh')
  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token', operationId: 'refreshToken' })
  @ApiBody({
    description: 'Refresh token',
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.refresh', body);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user', operationId: 'logout' })
  @ApiBody({
    description: 'Logout request',
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.logout', body);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset', operationId: 'forgotPassword' })
  @ApiBody({
    description: 'Email address',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'AUTH',
      'auth.forgot-password',
      body,
    );
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password', operationId: 'resetPassword' })
  @ApiBody({
    description: 'Reset password data',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'abc123def456' },
        newPassword: { type: 'string', minLength: 8, example: 'newpassword123@Aa' },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'AUTH',
      'auth.reset-password',
      body,
    );
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({ summary: 'Verify email with OTP code', operationId: 'verifyEmail' })
  @ApiBody({
    description: 'Email verification data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        code: { type: 'string', example: '123456', minLength: 6, maxLength: 6 },
      },
      required: ['userId', 'code'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email đã được xác thực thành công' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyEmail(@Body() body: { userId: string; code: string }): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'verify-email',
      body,
    );
  }

  @Post('resend-verification')
  @Public()
  @ApiOperation({ summary: 'Resend verification email', operationId: 'resendVerification' })
  @ApiBody({
    description: 'User ID to resend verification email',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Mã xác thực mới đã được gửi đến email của bạn' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email already verified or rate limit exceeded' })
  async resendVerification(@Body() body: { userId: string }): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'resend-verification-email',
      body,
    );
  }

  @Put('profile')
  @ResponseMessage('Profile updated successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile', operationId: 'updateProfile' })
  @ApiBody({
    description: 'Profile update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe Updated' },
        email: { type: 'string', format: 'email', example: 'newemail@example.com' },
        phone: { type: 'string', example: '+1234567890' },
        avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() body: unknown): Promise<unknown> {
    const data: any = await this.apiGateway.forwardToService('AUTH', 'auth.updateProfile', {
      userId: user.userId,
      ...(body as object),
    });
    return data;
  }

  @Post('oauth/google')
  @Public()
  @ResponseMessage('Logged in successfully with Google')
  @ApiOperation({ summary: 'Login with Google OAuth', operationId: 'oauthGoogleLogin' })
  @ApiBody({
    description: 'Google OAuth user data',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@gmail.com' },
        name: { type: 'string', example: 'John Doe' },
        avatarUrl: { type: 'string', example: 'https://lh3.googleusercontent.com/.../photo.jpg' },
        provider: { type: 'string', example: 'google' },
        providerUserId: { type: 'string', example: '123456789' },
      },
      required: ['email', 'provider', 'providerUserId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async oauthGoogleLogin(@Body() body: { email: string; name?: string; avatarUrl?: string; provider: string; providerUserId: string }): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.oauthLogin', body);
  }

  @Post('follow/:userId')
  @ResponseMessage('User followed successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Follow a user', operationId: 'followUser' })
  @ApiResponse({ status: 200, description: 'User followed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot follow yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already following this user' })
  async followUser(@CurrentUser() user: JwtPayload, @Param('userId') targetUserId: string): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.follow', {
      followerId: user.userId,
      followedId: targetUserId,
    });
  }

  @Delete('follow/:userId')
  @ResponseMessage('User unfollowed successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unfollow a user', operationId: 'unfollowUser' })
  @ApiResponse({ status: 200, description: 'User unfollowed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot unfollow yourself' })
  @ApiResponse({ status: 404, description: 'User not found or not following' })
  async unfollowUser(@CurrentUser() user: JwtPayload, @Param('userId') targetUserId: string): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.unfollow', {
      followerId: user.userId,
      followedId: targetUserId,
    });
  }

  @Get('followers')
  @ResponseMessage('Followers retrieved successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user followers', operationId: 'getFollowers' })
  @ApiResponse({
    status: 200,
    description: 'Followers retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          username: { type: 'string', example: 'johndoe' },
          name: { type: 'string', example: 'John Doe' },
          avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
        },
      },
    },
  })
  async getFollowers(@CurrentUser() user: JwtPayload): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.followers', { userId: user.userId });
  }

  @Get('following')
  @ResponseMessage('Following retrieved successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get users that current user is following', operationId: 'getFollowing' })
  @ApiResponse({
    status: 200,
    description: 'Following retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          username: { type: 'string', example: 'johndoe' },
          name: { type: 'string', example: 'John Doe' },
          avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
        },
      },
    },
  })
  async getFollowing(@CurrentUser() user: JwtPayload): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.following', { userId: user.userId });
  }

  @Get('profile')
  @ResponseMessage('Profile retrieved successfully')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user profile', operationId: 'getProfile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        username: { type: 'string', example: 'johndoe' },
        email: { type: 'string', example: 'john@example.com' },
        name: { type: 'string', example: 'John Doe' },
        role: { type: 'string', example: 'USER' },
        createdAt: { type: 'string', format: 'date-time', example: '2023-10-20T10:00:00Z' },
        updatedAt: { type: 'string', format: 'date-time', example: '2023-10-20T10:00:00Z' },
      },
    },
  })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<unknown> {
    return this.apiGateway.forwardToService('AUTH', 'auth.profile', { userId: user.userId });
  }
}
