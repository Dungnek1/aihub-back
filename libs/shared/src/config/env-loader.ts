import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * Load environment variables based on NODE_ENV
 * - Development/Local: loads .env.dev
 * - Production: loads .env
 */
export function loadEnvFile(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // Determine which env file to load
  const envFile = isProduction ? '.env' : '.env.dev';
  const envPath = path.resolve(process.cwd(), envFile);
  
  // Load the env file if it exists
  // Use override: true to ensure .env.dev overrides any existing env vars
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Loaded environment from ${envFile}`);
  } else {
    // Fallback to .env if .env.dev doesn't exist
    const fallbackPath = path.resolve(process.cwd(), '.env');
    if (existsSync(fallbackPath)) {
      dotenv.config({ path: fallbackPath, override: true });
      console.log(`⚠️  ${envFile} not found, using .env as fallback`);
    } else {
      console.warn(`⚠️  No .env file found (tried ${envFile} and .env)`);
    }
  }
}

/**
 * Get the env file path array for ConfigModule
 */
export function getEnvFilePath(): string[] {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // Priority: .env.dev for dev, .env for production
  // ConfigModule will try files in order and use the first that exists
  return isProduction ? ['.env'] : ['.env.dev', '.env'];
}

