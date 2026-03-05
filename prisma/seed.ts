import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCategories } from './seed.category';
import { seedTags } from './seed.tag';
import { seedAudiences } from './seed.audience';
import { seedPrices } from './seed.price';
import { seedTools } from './seed.tool';

// If Prisma client hasn't been generated for the new models yet,
// TypeScript will complain that properties don't exist on PrismaClient.
// We cast to `any` at the usage-site to allow the seed to run after
// running `npm run db:generate` (which is ensured by the package.json db:seed script).
const prisma = new PrismaClient();
const db: any = prisma; // runtime alias to avoid TS complaints before client is generated

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // ============================================
    // 1. Seed Prices
    // ============================================
    const priceIds = await seedPrices(db);

    // ============================================
    // 2. Seed Blog Categories
    // ============================================
    await seedCategories(db);

    // ============================================
    // 3. Seed Tool Tags
    // ============================================
    await seedTags(db);

    // ============================================
    // 4. Seed Tool Audiences
    // ============================================
    await seedAudiences(db);

    // ============================================
    // 5. Seed AI Tools
    // ============================================
    await seedTools(db, priceIds);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
