import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/redis';
import { Role } from '@app/shared/enum/user.enum';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  SignUpDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  OAuthLoginDto,
} from '../dto/auth.dto';
import {
  JwtPayload,
  AuthResponse,
  UserResponse,
} from '../interfaces/auth.interface';

@Injectable()
export class AuthServiceService {
  private readonly logger = new Logger(AuthServiceService.name);
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {
    this.accessTokenExpiry = parseInt(
      this.configService.get('JWT_EXPIRATION_SECONDS') || '3600',
    ); // 1 hour
    this.refreshTokenExpiry = parseInt(
      this.configService.get('REFRESH_TOKEN_EXPIRATION_SECONDS') || '604800',
    ); // 7 days
  }

  /**
   * Register a new user
   */
  async signup(signUpDto: SignUpDto): Promise<AuthResponse> {
    try {
      const { username, email, password, name, phone, avatarUrl } = signUpDto;

      // Check if user already exists
      const existingUser = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        throw new Error(
          existingUser.username === username
            ? 'Username already exists'
            : 'Email already exists',
        );
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          userId: crypto.randomUUID(),
          username,
          email,
          password: hashedPassword,
          name: name || null,
          phone: phone || null,
          avatarUrl: avatarUrl || null,
          role: 'USER',
          status: 'ACTIVE',
          createdAt: new Date()
        },
      });

      await this.prismaService.user.update({
        where: { userId: user.userId },
        data: {
          createdBy: user.userId,
        },
      });

      this.logger.log(`User registered successfully: ${username}`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Signup error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Signup error: ${error}`);
      throw new RpcException('Failed to register user');
    }
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { usernameOrEmail, password } = loginDto;

      // Find user by username or email
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      });

      if (!user) {
        throw new Error('Invalid username/email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error(`User account is ${user.status.toLowerCase()}`);
      }

      // Check if user registered via OAuth
      const isOAuthUser = await this.redisService.exists(`oauth:${user.userId}`);
      if (isOAuthUser) {
        throw new Error('This email has been registered via Google. You can set a password or login with Google to continue.');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password || '',
      );
      if (!isPasswordValid) {
        throw new Error('Invalid username/email or password');
      }

      this.logger.log(`User logged in: ${user.username}`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Login error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Login error: ${error}`);
      throw new RpcException('Failed to login');
    }
  }

  /**
   * Login admin (ADMIN or SUPPORT role)
   */
  async adminLogin(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { usernameOrEmail, password } = loginDto;

      // Find user by username or email
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      });

      if (!user) {
        throw new Error('Invalid username/email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error(`User account is ${user.status.toLowerCase()}`);
      }

      // Check if user has admin/support role
      if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
        throw new Error('Access denied. Admin privileges required.');
      }

      // Check if user registered via OAuth
      const isOAuthUser = await this.redisService.exists(`oauth:${user.userId}`);
      if (isOAuthUser) {
        throw new Error('This email has been registered via Google. You can set a password or login with Google to continue.');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password || '',
      );
      if (!isPasswordValid) {
        throw new Error('Invalid username/email or password');
      }

      this.logger.log(`Admin logged in: ${user.username} (${user.role})`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Admin login error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Admin login error: ${error}`);
      throw new RpcException('Failed to login');
    }
  }

  /**
   * Login user (USER role only)
   */
  async userLogin(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { usernameOrEmail, password } = loginDto;

      // Find user by username or email
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      });

      if (!user) {
        throw new Error('Invalid username/email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error(`User account is ${user.status.toLowerCase()}`);
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Email not verified. Please verify your email before logging in.');
      }

      // Check if user has USER role only
      if (user.role !== 'USER') {
        throw new Error('Access denied. User account required.');
      }

      // Check if user registered via OAuth
      const isOAuthUser = await this.redisService.exists(`oauth:${user.userId}`);
      if (isOAuthUser) {
        throw new Error('This email has been registered via Google. You can set a password or login with Google to continue.');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password || '',
      );
      if (!isPasswordValid) {
        throw new Error('Invalid username/email or password');
      }

      this.logger.log(`User logged in: ${user.username}`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {

      // Re-throw business logic errors (throw new Error()) using RpcException for RabbitMQ
      if (error instanceof Error && !(error instanceof UnauthorizedException)) {
        this.logger.error(`User login error: ${error.message}`);
        throw new RpcException(error.message);
      }
      if (error instanceof UnauthorizedException) {
        throw new RpcException(error.message);
      }
      this.logger.error(`User login error: ${error}`);
      throw new RpcException('Failed to login');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const { refreshToken } = refreshTokenDto;

      // Verify refresh token
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify(refreshToken, {
          secret:
            this.configService.get('REFRESH_TOKEN_SECRET') ||
            'your-refresh-secret-key',
        });
      } catch (error) {
        throw new Error('Invalid or expired refresh token');
      }

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.redisService.exists(
        `blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { userId: payload.userId },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('User not found or inactive');
      }

      this.logger.log(`Token refreshed for user: ${user.username}`);

      // Generate new tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Refresh token error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Refresh token error: ${error}`);
      throw new RpcException('Failed to refresh token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { currentPassword, newPassword, confirmPassword } =
        changePasswordDto;

      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirm password do not match');
      }

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await this.verifyPassword(
        currentPassword,
        user.password || '',
      );
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await this.prismaService.user.update({
        where: { userId },
        data: { password: hashedPassword, updatedAt: new Date() },
      });

      this.logger.log(`Password changed for user: ${user.username}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Change password error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Change password error: ${error}`);
      throw new RpcException('Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { email } = forgotPasswordDto;

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          message: 'If the email exists, a password reset link will be sent',
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      // Store reset token in Redis (expire in 1 hour)
      await this.redisService.setJson(
        `password_reset:${resetTokenHash}`,
        {
          userId: user.userId,
          expiresAt: resetTokenExpiry,
        },
        3600,
      );

      this.logger.log(`Password reset requested for email: ${email}`);

      // In production, send email with reset link
      // await this.emailService.sendPasswordResetEmail(email, resetToken);

      return {
        message: 'If the email exists, a password reset link will be sent',
      };
    } catch (error) {
      this.logger.error(`Forgot password error: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { token, newPassword } = resetPasswordDto;

      // Hash token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Get reset token from Redis
      const resetTokenData = await this.redisService.getJson<{
        userId: string;
        expiresAt: number;
      }>(`password_reset:${tokenHash}`);

      if (!resetTokenData) {
        throw new Error('Invalid or expired password reset token');
      }

      if (resetTokenData.expiresAt < Date.now()) {
        await this.redisService.del(`password_reset:${tokenHash}`);
        throw new Error('Password reset token has expired');
      }

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { userId: resetTokenData.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await this.prismaService.user.update({
        where: { userId: user.userId },
        data: { password: hashedPassword, updatedAt: new Date() },
      });

      // Delete reset token
      await this.redisService.del(`password_reset:${tokenHash}`);

      this.logger.log(`Password reset for user: ${user.username}`);

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Reset password error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Reset password error: ${error}`);
      throw new RpcException('Failed to reset password');
    }
  }

  /**
   * Logout user (blacklist refresh token)
   */
  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    try {
      // Blacklist refresh token
      await this.redisService.setJson(
        `blacklist:${refreshToken}`,
        { userId, blacklistedAt: new Date() },
        this.refreshTokenExpiry,
      );

      this.logger.log(`User logged out: ${userId}`);

      return { message: 'Logged out successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Logout error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Logout error: ${error}`);
      throw new RpcException('Failed to logout');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserResponse> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.mapUserToResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user profile error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user profile error: ${error}`);
      throw new RpcException('Failed to get user profile');
    }
  }


  async updateUserProfile(userId: string, updateData: UpdateProfileDto): Promise<UserResponse> {
    try {

      if (updateData.email) {
        const existingUser = await this.prismaService.user.findUnique({
          where: { email: updateData.email },
        });
        if (existingUser && existingUser.userId !== userId) {
          throw new Error('Email already exists');
        }
      }

      const updatedUser = await this.prismaService.user.update({
        where: { userId },
        data: {
          ...(updateData.name !== undefined && { name: updateData.name }),
          ...(updateData.email !== undefined && { email: updateData.email }),
          ...(updateData.phone !== undefined && { phone: updateData.phone }),
          ...(updateData.avatarUrl !== undefined && { avatarUrl: updateData.avatarUrl }),
        },
      });

      return this.mapUserToResponse(updatedUser);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update user profile error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update user profile error: ${error}`);
      throw new RpcException('Failed to update user profile');
    }
  }

  /**
   * OAuth login
   */
  async oauthLogin(oauthData: OAuthLoginDto): Promise<AuthResponse> {
    try {
      const { email, name, avatarUrl, provider, providerUserId } = oauthData;

      // Check if user exists by email
      let user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (user) {
        // User exists, check if OAuth identity exists
        const existingOauth = await this.prismaService.oauthIdentity.findUnique({
          where: {
            provider_providerUserId: {
              provider: provider as any,
              providerUserId,
            },
          },
        });

        if (!existingOauth) {
          // Create OAuth identity
          await this.prismaService.oauthIdentity.create({
            data: {
              userId: user.userId,
              provider: provider as any,
              providerUserId,
              createdBy: user.userId
            },
          });
        }

        // Store OAuth marker in Redis only if it doesn't exist yet (set expiry to 30 days)
        const oauthMarkerExists = await this.redisService.exists(`oauth:${user.userId}`);
        if (!oauthMarkerExists) {
          await this.redisService.setJson(
            `oauth:${user.userId}`,
            {
              provider,
              email,
              registeredAt: new Date().toISOString(),
            },
            2592000, // 30 days expiry
          );
        }

        this.logger.log(`User logged in via OAuth: ${email}`);
        return this.generateAuthResponse(user);
      } else {
        // User doesn't exist, create new user
        const username = await this.generateUsernameFromEmail(email);
        const userId = crypto.randomUUID();

        user = await this.prismaService.user.create({
          data: {
            userId,
            username,
            email,
            name: name || null,
            avatarUrl: avatarUrl || null,
            emailVerified: true, // No need to verify for OAuth
            role: 'USER',
            status: 'ACTIVE',
            canPost: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create OAuth identity
        await this.prismaService.oauthIdentity.create({
          data: {
            userId,
            provider: provider as any,
            providerUserId,
          },
        });

        // Store OAuth marker in Redis only if it doesn't exist yet (set expiry to 30 days)
        const oauthMarkerExists = await this.redisService.exists(`oauth:${userId}`);
        if (!oauthMarkerExists) {
          await this.redisService.setJson(
            `oauth:${userId}`,
            {
              provider,
              email,
              registeredAt: new Date().toISOString(),
            },
            2592000, // 30 days expiry
          );
        }

        this.logger.log(`New user registered via OAuth: ${email}`);
        return this.generateAuthResponse(user);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`OAuth login error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`OAuth login error: ${error}`);
      throw new RpcException('Failed to login with OAuth');
    }
  }

  private async generateUsernameFromEmail(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    let username = baseUsername;
    let counter = 1;

    // Ensure unique username
    while (true) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { username },
      });
      if (!existingUser) {
        break;
      }
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }


  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }


  private generateTokens(user: any): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JwtPayload = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${this.accessTokenExpiry}s`,
      secret: this.configService.get('JWT_SECRET') || 'your-secret-key',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: `${this.refreshTokenExpiry}s`,
      secret:
        this.configService.get('REFRESH_TOKEN_SECRET') ||
        'your-refresh-secret-key',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate auth response
   */
  private generateAuthResponse(user: any): AuthResponse {
    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  /**
   * Map user to response
   */
  private mapUserToResponse(user: any): UserResponse {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ===== Helper methods for RabbitMQ communication =====

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    return !!user;
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'your-secret-key',
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followedId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Cannot follow yourself
      if (followerId === followedId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if both users exist
      const [follower, followed] = await Promise.all([
        this.prismaService.user.findUnique({ where: { userId: followerId } }),
        this.prismaService.user.findUnique({ where: { userId: followedId } }),
      ]);

      if (!follower || !followed) {
        throw new Error('User not found');
      }

      // Check if already following
      const existingFollow = await this.prismaService.follow.findUnique({
        where: {
          followerId_followedId: {
            followerId,
            followedId,
          },
        },
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      await this.prismaService.follow.create({
        data: {
          followerId,
          followedId,
        },
      });

      this.logger.log(`User ${followerId} followed user ${followedId}`);
      return { success: true, message: 'User followed successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Follow user error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Follow user error: ${error}`);
      throw new RpcException('Failed to follow user');
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followedId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if the follow relationship exists
      const follow = await this.prismaService.follow.findUnique({
        where: {
          followerId_followedId: {
            followerId,
            followedId,
          },
        },
      });

      if (!follow) {
        throw new Error('Not following this user');
      }

      // Delete follow relationship
      await this.prismaService.follow.delete({
        where: {
          followerId_followedId: {
            followerId,
            followedId,
          },
        },
      });

      this.logger.log(`User ${followerId} unfollowed user ${followedId}`);
      return { success: true, message: 'User unfollowed successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Unfollow user error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Unfollow user error: ${error}`);
      throw new RpcException('Failed to unfollow user');
    }
  }

  /**
   * Get user followers
   */
  async getUserFollowers(userId: string): Promise<UserResponse[]> {
    try {
      const followers = await this.prismaService.follow.findMany({
        where: { followedId: userId },
        include: {
          follower: true,
        },
      });

      return followers.map((f) => this.mapUserToResponse(f.follower));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user followers error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user followers error: ${error}`);
      throw new RpcException('Failed to get user followers');
    }
  }

  /**
   * Get users that a user is following
   */
  async getUserFollowing(userId: string): Promise<UserResponse[]> {
    try {
      const following = await this.prismaService.follow.findMany({
        where: { followerId: userId },
        include: {
          followed: true,
        },
      });

      return following.map((f) => this.mapUserToResponse(f.followed));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user following error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user following error: ${error}`);
      throw new RpcException('Failed to get user following');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return null;
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Validate user password
   */
  async validateUserPassword(
    userId: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return false;
    }

    return this.verifyPassword(password, user.password || '');
  }

  // ===== ADMIN METHODS =====

  /**
   * Get all users with pagination and filters (admin only)
   */


  /**
   * Get user by ID (admin only) - returns all user fields
   */
  async getUserAdmin(userId: string): Promise<any> {
    const user = await this.prismaService.user.findFirst({
      where: {
        userId,
        deletedAt: null // Only return non-deleted users
      },
      include: {
        OauthIdentity: true,
        MfaTotp: true,
        followings: {
          include: {
            followed: true,
          },
        },
        followers: {
          include: {
            follower: true,
          },
        },
        _count: {
          select: {
            Content: true,
            Reaction: true,
            Comment: true,
            Share: true,
            followings: true,
            followers: true,
          },
        },
      },
    });

    if (!user) {
      throw new RpcException('User not found');
    }

    return user;
  }

  /**
   * Get all users with pagination and filters (admin only) - returns all user fields
   */
  async getUsersAdmin(params: {
    pageNo?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
    deleted?: boolean;
  }): Promise<{
    users: any[];
    total: number;
    pageNo: number;
    pageSize: number;
  }> {
    const { pageNo = 0, pageSize = 10, search, role, status, deleted } = params;

    // Build where clause
    const where: any = {};

    // Handle deleted filter
    if (deleted === true) {
      where.deletedAt = { not: null };
    } else if (deleted === false) {
      where.deletedAt = null;
    }
    // If deleted is undefined, show all users (both deleted and not deleted)

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await this.prismaService.user.count({ where });

    // Get users with all fields
    const users = await this.prismaService.user.findMany({
      where,
      skip: pageNo * pageSize,
      take: pageSize,
      select: {
        userId: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        canPost: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        deletedAt: true,
        deletedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      users,
      total,
      pageNo,
      pageSize,
    };
  }

  /**
   * Update user (admin only)
   */
  async updateUserAdmin(userId: string, data: {
    role?: Role;
    status?: string;
    emailVerified?: boolean;
    phone?: string;
    name?: string;
    bio?: string;
    canPost?: boolean;
    updatedBy?: string;
    password?: string;
  }): Promise<UserResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new RpcException('User not found');
    }

    const updateData: any = { ...data };

    // Hash new password if provided
    if (data.password) {
      if (data.password.length < 6) {
        throw new RpcException('Password must be at least 6 characters');
      }
      updateData.password = await this.hashPassword(data.password);
    }

    const updatedUser = await this.prismaService.user.update({
      where: { userId },
      data: updateData,
    });

    return this.mapUserToResponse(updatedUser);
  }

  /**
   * Create a new user (admin only)
   */
  async createUserAdmin(data: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: Role;
    status?: string;
    canPost?: boolean;
    createdBy: string;
  }): Promise<UserResponse> {
    try {
      const { username, email, password, name, phone, role, status = 'ACTIVE', canPost = false, createdBy } = data;

      // Check if user already exists
      const existingUser = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        throw new Error(
          existingUser.username === username
            ? 'Username already exists'
            : 'Email already exists',
        );
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          userId: crypto.randomUUID(),
          username,
          email,
          password: hashedPassword,
          name,
          phone: phone || null,
          role: role as any,
          status: status as any,
          canPost,
          emailVerified: true, // Admin-created users are auto-verified
          createdAt: new Date(),
          createdBy,
        },
      });

      this.logger.log(`User created by admin: ${username} (${role})`);

      return this.mapUserToResponse(user);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create user error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create user error: ${error}`);
      throw new RpcException('Failed to create user');
    }
  }

  /**
   * Delete user (soft delete by setting deletedAt and deletedBy) (admin only)
   */
  async deleteUserAdmin(userId: string, deletedBy: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new RpcException('User not found');
    }

    await this.prismaService.user.update({
      where: { userId },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy
      },
    });
  }

  /**
   * Get deleted users with pagination and search (admin only)
   */
  async getDeletedUsersAdmin(params: {
    pageNo?: number;
    pageSize?: number;
    search?: string;
  }): Promise<any> {
    const { pageNo = 0, pageSize = 10, search } = params;

    const where: any = {
      deletedAt: {
        not: null,
      },
    };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        select: {
          userId: true,
          username: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          phone: true,
          bio: true,
          canPost: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          deletedBy: true,
        },
        orderBy: { deletedAt: 'desc' },
        skip: pageNo * pageSize,
        take: pageSize,
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      users: users.map(user => this.mapUserToResponse(user)),
      pagination: {
        page: pageNo,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get deleted users statistics (admin only)
   */
  async getDeletedUsersStatsAdmin(): Promise<any> {
    const [
      totalDeleted,
      deletedToday,
      deletedThisWeek,
      deletedThisMonth,
      deletedByRole,
    ] = await Promise.all([
      // Total deleted users
      this.prismaService.user.count({
        where: { deletedAt: { not: null } },
      }),

      // Deleted today
      this.prismaService.user.count({
        where: {
          deletedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),

      // Deleted this week (last 7 days)
      this.prismaService.user.count({
        where: {
          deletedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Deleted this month (last 30 days)
      this.prismaService.user.count({
        where: {
          deletedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Deleted users by role
      this.prismaService.user.groupBy({
        by: ['role'],
        where: { deletedAt: { not: null } },
        _count: true,
      }),
    ]);

    return {
      totalDeleted,
      deletedToday,
      deletedThisWeek,
      deletedThisMonth,
      deletedByRole: deletedByRole.reduce((acc, item) => {
        acc[item.role] = item._count as number;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
