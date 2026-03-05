import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { AuthServiceService } from '../services/auth-service.service';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import {
  SignUpDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  OAuthLoginDto,
} from '../dto/auth.dto';
import { ApiResponse } from '../dto/response.dto';
import { JwtPayload } from '@app/shared/interface.ts/user.interface';

// Helper type guard for Rmq message ack/nack
function isAckNackable(msg: unknown): msg is {
  ack: (m?: unknown) => void;
  nack: (m?: unknown, allUpTo?: boolean, requeue?: boolean) => void;
} {
  return (
    typeof msg === 'object' && msg !== null && 'ack' in msg && 'nack' in msg
  );
}

/**
 * Auth Controller
 * Handles user authentication endpoints
 */
@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) { }

  // ===== REST API Endpoints (called by API Gateway) =====

  /**
   * POST /auth/signup
   * Register a new user
   */
  @Post('signup')
  async signup(@Body() signUpDto: SignUpDto) {
    const result = await this.authService.signup(signUpDto);
    return new ApiResponse(true, 'User registered successfully', result, 201);
  }

  /**
   * POST /auth/login
   * Login user
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return new ApiResponse(true, 'Login successful', result, 200);
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return new ApiResponse(true, 'Token refreshed successfully', result, 200);
  }

  /**
   * POST /auth/change-password
   * Change user password (requires auth)
   */
  @Post('change-password')
  async changePassword(@Body() body: any) {
    // In production, extract userId from JWT token via @UseGuards(JwtAuthGuard) and @CurrentUser()
    // For now, we're assuming this is protected
    throw new BadRequestException('This endpoint requires authentication');
  }

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return new ApiResponse(true, result.message, null, 200);
  }

  /**
   * POST /auth/reset-password
   * Reset password using reset token
   */
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return new ApiResponse(true, result.message, null, 200);
  }

  /**
   * POST /auth/logout
   * Logout user and blacklist refresh token
   */
  @Post('logout')
  async logout(@Body() body: { userId: string; refreshToken: string }) {
    const result = await this.authService.logout(
      body.userId,
      body.refreshToken,
    );
    return new ApiResponse(true, result.message, null, 200);
  }

  /**
   * GET /auth/profile/:userId
   * Get user profile (placeholder - would be /auth/me with JWT auth)
   */
  @Get('profile')
  getProfile() {
    throw new BadRequestException('This endpoint requires authentication');
  }

  // ===== RabbitMQ Message Pattern Handlers =====

  @MessagePattern('auth.check_exists_email')
  async handleCheckExistsEmail(
    @Payload() data: { email: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.checkEmailExists(data.email);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { exists: result };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.verify_token')
  async handleVerifyToken(
    @Payload() data: { token: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.verifyToken(data.token);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.get_user')
  async handleGetUser(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getUserById(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.validate_password')
  async handleValidatePassword(
    @Payload() data: { userId: string; password: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.validateUserPassword(
        data.userId,
        data.password,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { valid: result };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // @MessagePattern('auth.user.signup')
  @MessagePattern('auth.signup')
  async handleSignupEvent(
    @Payload()
    data: {
      username: string;
      email: string;
      password: string;
      name?: string;
      phone?: string;
      avatarUrl?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const signupDto: SignUpDto = {
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
      };
      const result = await this.authService.signup(signupDto);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // @MessagePattern('auth.user.login')
  @MessagePattern('auth.login')
  async handleLoginEvent(
    @Payload()
    data: {
      usernameOrEmail: string;
      password: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const loginDto: LoginDto = {
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
      };
      const result = await this.authService.login(loginDto);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.login')
  async handleAdminLoginEvent(
    @Payload()
    data: {
      usernameOrEmail: string;
      password: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const loginDto: LoginDto = {
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
      };
      const result = await this.authService.adminLogin(loginDto);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('user.login')
  async handleUserLoginEvent(
    @Payload()
    data: {
      usernameOrEmail: string;
      password: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const loginDto: LoginDto = {
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
      };
      const result = await this.authService.userLogin(loginDto);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.refresh')
  async handleRefreshMessage(
    @Payload() data: { refreshToken: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.refreshToken({
        refreshToken: data.refreshToken,
      } as any);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.logout')
  async handleLogoutMessage(
    @Payload() data: { userId: string; refreshToken: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.logout(data.userId, data.refreshToken);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // RPC alias: profile (returns null when userId not provided)
  @MessagePattern('auth.profile')
  async handleProfileMessage(
    @Payload() data: { userId?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      if (!data || !data.userId) {
        if (isAckNackable(originalMsg)) channel.ack(originalMsg);
        return null;
      }
      const result = await this.authService.getUserProfile(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.updateProfile')
  async handleUpdateProfileMessage(
    @Payload() data: { userId?: string; name?: string; email?: string; phone?: string; avatarUrl?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      if (!data || !data.userId) {
        if (isAckNackable(originalMsg)) channel.ack(originalMsg);
        return null;
      }

      const { userId, ...updateData } = data;
      const result = await this.authService.updateUserProfile(userId, updateData as any);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.oauthLogin')
  async handleOAuthLoginMessage(
    @Payload() data: { email: string; name?: string; avatarUrl?: string; provider: string; providerUserId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.oauthLogin(data as OAuthLoginDto);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.follow')
  async handleFollowMessage(
    @Payload() data: { followerId: string; followedId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.followUser(data.followerId, data.followedId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.unfollow')
  async handleUnfollowMessage(
    @Payload() data: { followerId: string; followedId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.unfollowUser(data.followerId, data.followedId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.followers')
  async handleGetFollowersMessage(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getUserFollowers(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('auth.following')
  async handleGetFollowingMessage(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getUserFollowing(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== ADMIN MESSAGE PATTERNS =====

  @MessagePattern('admin.getUsers')
  async handleAdminGetUsers(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getUsersAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getUser')
  async handleAdminGetUser(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getUserAdmin(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.updateUser')
  async handleAdminUpdateUser(
    @Payload() data: { userId: string;[key: string]: any },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { userId, ...updateData } = data;
      const result = await this.authService.updateUserAdmin(userId, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.deleteUser')
  async handleAdminDeleteUser(
    @Payload() data: { userId: string, deletedBy: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      await this.authService.deleteUserAdmin(data.userId, data.deletedBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { success: true };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.createUser')
  async handleAdminCreateUser(
    @Payload() data: {
      username: string;
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: string;
      status?: string;
      canPost?: boolean;
      createdBy: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.createUserAdmin({
        ...data,
        role: data.role as any,
      });
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getDeletedUsers')
  async handleAdminGetDeletedUsers(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getDeletedUsersAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getDeletedUsersStats')
  async handleAdminGetDeletedUsersStats(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.authService.getDeletedUsersStatsAdmin();
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // @MessagePattern('admin.getUsers')
  // async handleAdminGetUsers(
  //   @Payload() data: {
  //     pageNo?: number;
  //     pageSize?: number;
  //     search?: string;
  //     role?: string;
  //     status?: string;
  //   },
  //   @Ctx() context: RmqContext,
  // ) {
  //   const channel = context.getChannelRef();
  //   const originalMsg = context.getMessage() as unknown;
  //   try {
  //     const result = await this.authService.getUsersAdmin(data);
  //     if (isAckNackable(originalMsg)) channel.ack(originalMsg);
  //     return result;
  //   } catch (error) {
  //     if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
  //     throw error;
  //   }
  // }
}
