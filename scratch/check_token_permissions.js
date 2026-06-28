const db = require('../server/src/db/client.js');
const { decrypt } = require('../server/src/utils/encryption.js');
const https = require('https');

function checkTokenForUser(user, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'PR-Insight-Checker',
        'Accept': 'application/vnd.github+json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`User: ${user.username} (${user.id})`);
        console.log(`- Token starts with: ${token.substring(0, 8)}...`);
        console.log(`- Status: ${res.statusCode}`);
        console.log(`- Scopes (X-OAuth-Scopes): ${res.headers['x-oauth-scopes']}`);
        if (res.statusCode !== 200) {
          console.log(`- Error Response: ${data.trim()}`);
        } else {
          const u = JSON.parse(data);
          console.log(`- Authenticated as GitHub User: ${u.login}`);
        }
        console.log('--------------------------------------------------');
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Error requesting for ${user.username}:`, err.message);
      resolve();
    });
  });
}

async function checkAllTokens() {
  try {
    const usersRes = await db.query('SELECT id, username FROM users');
    console.log(`Found ${usersRes.rows.length} users in database.`);
    console.log('✓ Database tables verified.');

    for (const user of usersRes.rows) {
      const credRes = await db.query(
        'SELECT encrypted_data FROM user_credentials WHERE user_id = $1',
        [user.id]
      );
      if (!credRes.rows[0]) {
        console.log(`User: ${user.username} -> No credentials found.`);
        continue;
      }
      
      const credentials = JSON.parse(decrypt(credRes.rows[0].encrypted_data));
      const token = credentials['GITHUB_TOKEN'];
      if (!token) {
        console.log(`User: ${user.username} -> No GITHUB_TOKEN in credentials.`);
        continue;
      }

      await checkTokenForUser(user, token);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAllTokens();
