import { PrismaClient } from '@prisma/client';

export async function seedTags(db: any) {
    console.log('🏷️  Seeding Tool Tags...');

    const toolTags = await db.tag.createMany({
        data: [
            { name: 'AI' },
            { name: 'Machine Learning' },
            { name: 'Deep Learning' },
            { name: 'Natural Language Processing' },
            { name: 'Computer Vision' },
            { name: 'Chatbot' },
            { name: 'Image Generation' },
            { name: 'Text-to-Speech' },
            { name: 'Speech-to-Text' },
            { name: 'Code Generation' },
            { name: 'Data Analysis' },
            { name: 'Automation' },
            { name: 'Productivity' },
            { name: 'Creative' },
            { name: 'Educational' },
            { name: 'Business' },
            { name: 'Free' },
            { name: 'Paid' },
            { name: 'Open Source' },
            { name: 'API' },
            { name: 'Web App' },
            { name: 'Mobile App' },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${toolTags.count} tool tags`);
}