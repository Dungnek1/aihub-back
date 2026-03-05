import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { seedCourses } from '../prisma/seed.course';
import { seedToolMarketings } from '../prisma/seed.tool-marketing';
import { seedPrices } from '../prisma/seed.price';

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
const db: any = prisma;

async function main() {
  console.log('🌱 Starting Courses and Tool Marketings seeding...\n');

  try {
    // Get or create admin user
    let adminUser = await db.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { email: 'admin@aihub.com' },
          { role: 'ADMIN' },
        ],
      },
    });

    if (!adminUser) {
      console.log('⚠️  Admin user not found. Please run: npm run db:create-admin');
      process.exit(1);
    }

    console.log(`✅ Using admin user: ${adminUser.username} (${adminUser.userId})\n`);

    // Seed Prices (required for courses and tool marketings)
    console.log('💰 Seeding Prices...');
    const priceIds = await seedPrices(db);
    console.log('');

    // Seed Courses
    console.log('📚 Seeding Courses...');
    await seedCourses(db, priceIds, adminUser.userId);
    console.log('');

    // Seed Tool Marketings
    console.log('📢 Seeding Tool Marketings...');
    await seedToolMarketings(db, priceIds, adminUser.userId);
    console.log('');

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

