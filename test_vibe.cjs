const https = require('https');

const projectId = 'heartsync-98ba4';
const url = `https://us-central1-${projectId}.cloudfunctions.net/checkVibe`;

console.log(`Testing URL: ${url}`);

const data = JSON.stringify({
    username: 'test_user',
    periodId: 'test_season'
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(url, options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(`Body: ${body}`));
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(data);
req.end();
