import { PrismaClient } from '@prisma/client';

export async function seedPrices(db: any) {
    console.log('💰 Seeding Prices...');

    // Create common price tiers used by tools
    const free = await db.price.upsert({
        where: { name: 'Free' },
        update: {},
        create: { name: 'Free', createdBy: 'seed' },
    });

    const freemium = await db.price.upsert({
        where: { name: 'Freemium' },
        update: {},
        create: { name: 'Freemium', createdBy: 'seed' },
    });

    const subscription = await db.price.upsert({
        where: { name: 'Subscription' },
        update: {},
        create: { name: 'Subscription', createdBy: 'seed' },
    });

    const paid = await db.price.upsert({
        where: { name: 'Paid' },
        update: {},
        create: { name: 'Paid', createdBy: 'seed' },
    });

    console.log('✅ Prices seeded');

    return {
        free: free.id,
        freemium: freemium.id,
        subscription: subscription.id,
        paid: paid.id,
    };
}
