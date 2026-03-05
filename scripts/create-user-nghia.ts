import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Load environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env' : '.env.dev';
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
  console.log(`✅ Loaded environment from ${envFile}`);
} else {
  const fallbackPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath, override: true });
    console.log(`⚠️  ${envFile} not found, using .env as fallback`);
  }
}

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createUserNghia() {
  console.log('🔐 Creating admin user: nghia...\n');

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'nghia' },
          { email: 'nghiait06@gmail.com' },
        ],
      },
    });

    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser.userId}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log('\n💡 To update user, please delete the existing user first or use update API.');
      return;
    }

    // User data
    const userData = {
      userId: crypto.randomUUID(),
      username: 'nghia',
      email: 'nghiait06@gmail.com',
      password: '1234',
      name: 'Nghia',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      canPost: true,
      emailVerified: true,
    };

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        canPost: userData.canPost,
        emailVerified: userData.emailVerified,
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Credentials:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${userData.password}`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createUserNghia()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

