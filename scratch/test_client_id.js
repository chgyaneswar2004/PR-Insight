const https = require('https');

function testUrl(clientId) {
  return new Promise((resolve) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}`;
    https.get(url, (res) => {
      console.log(`Client ID: ${clientId} -> Status: ${res.statusCode}, Location: ${res.headers.location}`);
      resolve();
    }).on('error', (err) => {
      console.error(`Error for ${clientId}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  // Test with number 1
  await testUrl('Iv23liR8HrsLhbQE1XBs');
  
  // Test with lowercase letter l
  await testUrl('Iv23liR8HrsLhbQElXBs');
}

run();
