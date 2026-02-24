
const https = require('https');

function checkEndpoint(endpoint) {
    const options = {
        hostname: 'demo-api-capital.backend-capital.com',
        path: '/api/v1/' + endpoint,
        method: 'GET'
    };
    
    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log(endpoint, res.statusCode, data.substring(0, 100)));
    });
    
    req.on('error', error => console.error(error));
    req.end();
}

checkEndpoint('calendar');
checkEndpoint('economic-calendar');
checkEndpoint('news');
checkEndpoint('markets/news');
checkEndpoint('events');

