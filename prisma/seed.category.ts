import { PrismaClient } from '@prisma/client';

export async function seedCategories(db: any) {
    console.log('📁 Seeding Blog Categories...');

    const blogCategories = await db.categories.createMany({
        data: [
            {
                name: 'AI News',
                slug: 'ai-news',
                description: 'Latest news and updates in artificial intelligence',
            },
            {
                name: 'Research',
                slug: 'research',
                description: 'Academic research and breakthroughs in AI',
            },
            {
                name: 'Tools & Applications',
                slug: 'tools-applications',
                description: 'AI tools, software, and practical applications',
            },
            {
                name: 'Ethics & Society',
                slug: 'ethics-society',
                description: 'AI ethics, societal impact, and responsible AI',
            },
            {
                name: 'Business & Industry',
                slug: 'business-industry',
                description: 'AI in business, industry applications, and trends',
            },
            {
                name: 'Tutorials & Guides',
                slug: 'tutorials-guides',
                description: 'How-to guides, tutorials, and learning resources',
            },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${blogCategories.count} blog categories`);
}
