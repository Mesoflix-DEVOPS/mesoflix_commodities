
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
require('dotenv').config();

function decrypt(text) {
    if (!text) return '';
    try {
        const [iv, encrypted] = text.split(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return text;
    }
}

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const [master] = await sql`SELECT encrypted_api_key FROM capital_accounts WHERE label = 'MASTER' LIMIT 1`;
        const decrypted = decrypt(master.encrypted_api_key);
        console.log('Starts with {:', decrypted.startsWith('{'));
        if (decrypted.startsWith('{')) {
            try {
                const p = JSON.parse(decrypted);
                console.log('Keys in JSON:', Object.keys(p));
            } catch (e) {
                console.log('JSON Parse failed');
            }
        } else {
            console.log('Raw string detected');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
