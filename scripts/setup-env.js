const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecret() {
    return crypto.randomBytes(32).toString('hex');
}

function ensureEnvVars() {
    console.log('[Build] Checking environment variables...');
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    let updated = false;

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET && !envContent.includes('JWT_SECRET=')) {
        const secret = generateSecret();
        console.log('[Build] JWT_SECRET missing. Generating a random one...');
        envContent += `\nJWT_SECRET=${secret}\n`;
        process.env.JWT_SECRET = secret;
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(envPath, envContent);
        console.log('[Build] .env updated with missing variables.');
    }
}

function setup() {
    try {
        console.log('[Pre-build] Ensuring environment variables are set...');
        ensureEnvVars();
        console.log('[Pre-build] Success!');
    } catch (error) {
        console.error('[Pre-build] Failed:', error.message);
        process.exit(1);
    }
}

setup();
