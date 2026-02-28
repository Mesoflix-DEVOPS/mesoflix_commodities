import { db } from './src/lib/db';
import { supportAgents, learnClasses } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function updateDb() {
    console.log('🔄 Updating database...');

    try {
        // 1. Deactivate 2FA for john@gmail.com
        const [agent] = await db.select().from(supportAgents).where(eq(supportAgents.email, 'john@gmail.com'));

        if (agent) {
            await db.update(supportAgents)
                .set({ two_factor_enabled: false })
                .where(eq(supportAgents.email, 'john@gmail.com'));
            console.log('✅ 2FA deactivated for john@gmail.com');
        } else {
            console.log('⚠️ Agent john@gmail.com not found. Skipping 2FA deactivation.');
        }

        // 2. Add first class directly to database
        const classes = await db.select().from(learnClasses);
        if (classes.length === 0) {
            await db.insert(learnClasses).values({
                title: "Introduction to Financial Markets",
                description: "Master the basics of trading from scratch. This comprehensive guide covers market mechanics, types of assets, and how to start your journey.",
                youtube_url: "https://www.youtube.com/embed/yM6s8acNla4",
                category: "Beginner",
            });
            console.log('✅ First lesson added to learn_classes.');
        } else {
            console.log('ℹ️ Academy already has lessons. Skipping seeding.');
        }

    } catch (error) {
        console.error('❌ Database update failed:', error);
    }
}

updateDb();
