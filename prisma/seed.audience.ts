import { PrismaClient } from '@prisma/client';

export async function seedAudiences(db: any) {
    console.log('👥 Seeding Tool Audiences...');

    const audiences = await db.audience.createMany({
        data: [
            { name: 'Beginner' },
            { name: 'Developer' },
            { name: 'Designer' },
            { name: 'Business Professional' },
            { name: 'Student' },
            { name: 'Researcher' },
            { name: 'Entrepreneur' },
            { name: 'Data Scientist' },
            { name: 'Marketer' },
            { name: 'Educator' },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${audiences.count} tool audiences`);
}