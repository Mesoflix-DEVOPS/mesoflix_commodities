
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const KEY_MATERIAL = process.env.CAPITAL_ENCRYPTION_KEY || 'default-unsafe-key';
const ENCRYPTION_KEY = crypto.scryptSync(KEY_MATERIAL, 'salt', 32);

function decrypt(text) {
    try {
        const [ivHex, tagHex, encryptedHex] = text.split(':');
        if (!ivHex || !tagHex || !encryptedHex) return text;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return text;
    }
}

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        const [cred] = await sql`SELECT * FROM capital_accounts WHERE user_id = ${userId} AND is_active = true`;
        const decryptedKey = decrypt(cred.encrypted_api_key);
        let apiKey, password;
        if (decryptedKey.startsWith('{')) {
            const p = JSON.parse(decryptedKey);
            apiKey = p.apiKey;
            password = p.password;
        } else {
            apiKey = decryptedKey;
            password = decrypt(cred.encrypted_api_password);
        }
        const [user] = await sql`SELECT email FROM users WHERE id = ${userId}`;

        console.log('Logging in to Capital.com...');
        const loginRes = await fetch('https://api-capital.backend-capital.com/api/v1/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CAP-API-KEY': apiKey },
            body: JSON.stringify({ identifier: user.email, password, encryptedPassword: false })
        });

        if (!loginRes.ok) {
            console.error('Login Failed:', loginRes.status, await loginRes.text());
            process.exit(1);
        }

        const cst = loginRes.headers.get('CST');
        const xst = loginRes.headers.get('X-SECURITY-TOKEN');
        const loginData = await loginRes.json();
        const dAcc = loginData.accounts.find(a => a.accountName.toLowerCase().includes('demo'));

        console.log('Switching to account:', dAcc.accountId);
        const switchRes = await fetch('https://api-capital.backend-capital.com/api/v1/session', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'CST': cst, 'X-SECURITY-TOKEN': xst },
            body: JSON.stringify({ accountId: dAcc.accountId })
        });

        console.log('Fetching prices for GOLD, US500, SPX...');
        const mktRes = await fetch(`https://api-capital.backend-capital.com/api/v1/markets?epics=GOLD,US500,SPX`, {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
        });
        const mktData = await mktRes.json();
        console.log('--- MARKET DATA ---');
        mktData.marketDetails.forEach(m => {
            console.log(`Epic: ${m.instrument.epic} | Name: ${m.instrument.instrumentName} | Bid: ${m.snapshot.bid} | Offer: ${m.snapshot.offer}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic Script Error:', err);
        process.exit(1);
    }
}
check();
