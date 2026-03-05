import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Optional() @Inject(ConfigService) private configService?: ConfigService) {
    // Detect if running inside Docker container
    let isDocker = false;
    try {
      isDocker = 
        process.env.DOCKER_ENV === 'true' ||
        process.env.RUNNING_IN_DOCKER === 'true' ||
        (fs.existsSync('/.dockerenv')) ||
        (fs.existsSync('/proc/self/cgroup') && 
          fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker'));
    } catch (error) {
      // If check fails (e.g., on Windows), assume not in Docker
      isDocker = false;
    }

    // Get both URLs
    const databaseUrlFromEnv = 
      process.env.DATABASE_URL || 
      configService?.get<string>('DATABASE_URL');
    const databaseUrlLocal = 
      process.env.DATABASE_URL_LOCAL || 
      configService?.get<string>('DATABASE_URL_LOCAL');

    // Smart URL selection:
    // - If running in Docker: prefer DATABASE_URL (with postgres hostname)
    // - If running locally: prefer DATABASE_URL_LOCAL (with localhost)
    //   If DATABASE_URL has postgres hostname when running locally, auto-fix to localhost
    let databaseUrl: string | undefined;

    if (isDocker) {
      // Running in Docker - use DATABASE_URL (with postgres hostname)
      databaseUrl = databaseUrlFromEnv || databaseUrlLocal;
    } else {
      // Running locally - prefer DATABASE_URL_LOCAL
      if (databaseUrlLocal) {
        databaseUrl = databaseUrlLocal;
      } else if (databaseUrlFromEnv) {
        // If DATABASE_URL exists but has Docker hostname, auto-convert to localhost
        if (databaseUrlFromEnv.includes('@postgres:')) {
          databaseUrl = databaseUrlFromEnv.replace(/@postgres:/g, '@localhost:');
          // Use console.warn since we can't use this.logger before super()
          console.warn(
            '⚠️ [PrismaService] Detected Docker hostname (postgres) but running locally. Auto-converting to localhost.'
          );
        } else {
          databaseUrl = databaseUrlFromEnv;
        }
      }
    }
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL or DATABASE_URL_LOCAL is not defined. Please set it in your .env file or environment variables.'
      );
    }

    // Log the database URL being used (without password for security)
    const safeUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    const envMode = isDocker ? '🐳 Docker' : '💻 Local';
    console.log(`🔗 [PrismaService] ${envMode} - Connecting to database: ${safeUrl}`);

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log:
        process.env.NODE_ENV === 'production'
          ? ['error']
          : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'info' },
          ],
      errorFormat: 'pretty',
      transactionOptions: {
        maxWait: 5000,
        timeout: 10000,
      },
    });
  }

  /** Called when NestJS starts up */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');

      await this.optimizeConnection();
    } catch (error) {
      this.logger.error('❌ Prisma connection failed:', error);
      throw error;
    }
  }

  /** Called when NestJS shuts down */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🧩 Prisma disconnected from database');
    } catch (error) {
      this.logger.error('⚠️ Prisma disconnection failed:', error);
    }
  }

  /** Optimize Postgres session for better performance */
  private async optimizeConnection() {
    const optimizations = [
      `SET statement_timeout = '30s'`,
      `SET lock_timeout = '10s'`,
      `SET idle_in_transaction_session_timeout = '60s'`,
      `SET random_page_cost = 1.1`,
      `SET seq_page_cost = 1.0`,
      `SET cpu_tuple_cost = 0.01`,
      `SET effective_cache_size = '256MB'`,
      `SET timezone = 'UTC'`,
      `SET plan_cache_mode = 'auto'`,
      `SET work_mem = '16MB'`,
      `SET maintenance_work_mem = '64MB'`,
    ];

    try {
      await this.$executeRaw`DEALLOCATE ALL`;

      for (const sql of optimizations) {
        try {
          await this.$executeRawUnsafe(sql);
          this.logger.debug(`Executed: ${sql}`);
        } catch (err: any) {
          if (err.message?.includes('cannot be changed without restarting')) {
            this.logger.debug(`Skipped (needs restart): ${sql}`);
          } else {
            this.logger.debug(`Failed: ${sql} — ${err.message}`);
          }
        }
      }

      this.logger.debug('✅ Database session optimized');
    } catch (error) {
      this.logger.warn('⚠️ Failed to optimize database session:', error);
    }
  }

  /** Handle "prepared statement already exists" conflicts */
  private async clearPreparedStatements() {
    try {
      await this.$executeRaw`DEALLOCATE ALL`;
      this.logger.debug('Cleared all prepared statements');
    } catch (error) {
      this.logger.warn('Failed to clear prepared statements:', error);
    }
  }

  /** Retry wrapper for safe Prisma operations */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (
          error.message?.includes('prepared statement') &&
          error.message?.includes('already exists')
        ) {
          this.logger.warn(
            `Conflict detected on attempt ${attempt}, clearing statements...`,
          );
          await this.clearPreparedStatements();
          await this.delay(100);
          continue;
        }

        if (attempt === maxRetries) {
          this.logger.error(
            `Operation failed after ${maxRetries} attempts`,
            error,
          );
          throw lastError;
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        this.logger.warn(
          `Attempt ${attempt} failed, retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }

  /** Lightweight helper for safe single queries */
  async safeQuery<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (
        error.message?.includes('prepared statement') &&
        error.message?.includes('already exists')
      ) {
        this.logger.warn(
          'Prepared statement conflict, clearing and retrying...',
        );
        await this.clearPreparedStatements();
        return await operation();
      }
      throw error;
    }
  }

  /** Simple DB health check */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PrismaService;
