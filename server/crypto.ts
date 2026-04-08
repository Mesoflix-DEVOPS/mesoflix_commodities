import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Validate Encryption Key
const RAW_ENC_KEY = process.env.CAPITAL_ENCRYPTION_KEY;
if (!RAW_ENC_KEY || RAW_ENC_KEY.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("FATAL: CAPITAL_ENCRYPTION_KEY on Render is missing or too short.");
    }
    console.warn("WARNING: CAPITAL_ENCRYPTION_KEY on Render is missing or too short. Using a default unsafe key.");
}
const ENCRYPTION_KEY = crypto.scryptSync(RAW_ENC_KEY || 'default-unsafe-key', 'salt', 32);

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare a plain password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decrypt(text: string): string {
    try {
        const [ivHex, tagHex, encryptedHex] = text.split(':');

        if (!ivHex || !tagHex || !encryptedHex) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e) {
        console.error("Decryption Error on Render:", e.message);
        throw e;
    }
}
