import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Validate Encryption Key
if (!process.env.CAPITAL_ENCRYPTION_KEY || process.env.CAPITAL_ENCRYPTION_KEY.length < 32) {
    console.warn("WARNING: CAPITAL_ENCRYPTION_KEY is missing or too short. Using a default unsafe key for dev.");
}
const ENCRYPTION_KEY = crypto.scryptSync(process.env.CAPITAL_ENCRYPTION_KEY || 'default-unsafe-key', 'salt', 32);

/**
 * Compare a plain password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decrypt(text: string): string {
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
}
