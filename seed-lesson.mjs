import { db } from './src/lib/db';
import { learnClasses } from './src/lib/db/schema';

async function seed() {
    console.log('🌱 Seeding first academy lesson...');
    try {
        await db.insert(learnClasses).values({
            title: "Introduction to Financial Markets",
            description: "Master the basics of trading from scratch. This comprehensive guide covers market mechanics, types of assets, and how to start your journey.",
            youtube_url: "https://www.youtube.com/embed/yM6s8acNla4?si=QezfxYYdh_pBRAgf",
            category: "Beginner",
        });
        console.log('✅ Seed successful!');
    } catch (error) {
        console.error('❌ Seed failed:', error);
    }
}

seed();
