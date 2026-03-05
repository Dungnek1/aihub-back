import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

async function createAdmin() {
  console.log('🔐 Creating admin user...\n');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { email: 'admin@aihub.com' },
          { role: 'ADMIN' },
        ],
      },
    });

 
    // Default admin credentials
    const adminData = {
      userId: 'admin-5',
      username: 'admin5',
      email: 'admin5@aihub.com',
      password: '123', // Default password - should be changed after first login
      name: 'Administrator',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      canPost: true,
      emailVerified: true,
    };

    // Hash password
    const hashedPassword = await hashPassword(adminData.password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        userId: adminData.userId,
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: adminData.role,
        status: adminData.status,
        canPost: adminData.canPost,
        emailVerified: adminData.emailVerified,
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Email: admin@aihub.com');
    console.log('   Password: Admin@123456');
    console.log('   User ID:', admin.userId);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

