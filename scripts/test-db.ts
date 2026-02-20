import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Checking database connection...");
    try {
        const result = await db.select().from(users).limit(1);
        console.log("Connection successful!");
        console.log("Users found:", result.length);
    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

main();
