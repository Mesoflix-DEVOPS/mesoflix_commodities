
async function test() {
    try {
        console.log('Testing connectivity to Capital.com...');
        const res = await fetch('https://api-capital.backend-capital.com/api/v1/session', { method: 'OPTIONS' });
        console.log('Status:', res.status);
        process.exit(0);
    } catch (err) {
        console.error('Connectivity Test Failed:', err);
        process.exit(1);
    }
}
test();
