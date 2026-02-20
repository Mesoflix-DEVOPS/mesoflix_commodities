import { db } from "../src/lib/db";
import { systemSettings } from "../src/lib/db/schema";
import { encrypt } from "../src/lib/crypto";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MASTER_CREDENTIALS = {
    login: "lemicmelic@gmail.com",
    password: "lemicproject002@Gm", // Included from chat context
    apiKey: "NyjIrILs6Uw6zD2f"       // Included from chat context
};

async function seedMasterCredentials() {
    console.log("Seeding Master Credentials...");

    try {
        const json = JSON.stringify(MASTER_CREDENTIALS);
        const encrypted = encrypt(json);

        await db.insert(systemSettings).values({
            key: 'capital_master_credentials',
            value: encrypted,
            updated_at: new Date(),
        }).onConflictDoUpdate({
            target: systemSettings.key,
            set: {
                value: encrypted,
                updated_at: new Date()
            }
        });

        console.log("Master credentials seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Failed to seed credentials:", error);
        process.exit(1);
    }
}

seedMasterCredentials();
