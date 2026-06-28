const db = require('../server/src/db/client.js');
const { decrypt } = require('../server/src/utils/encryption.js');
const https = require('https');

async function testMerge() {
  try {
    // 1. Get chgyaneswar2004 user
    const usersRes = await db.query("SELECT id, username FROM users WHERE username = 'chgyaneswar2004'");
    if (usersRes.rows.length === 0) {
      console.log('User chgyaneswar2004 not found in database.');
      return;
    }
    const user = usersRes.rows[0];

    // 2. Get decrypted credentials
    const credRes = await db.query(
      'SELECT encrypted_data FROM user_credentials WHERE user_id = $1',
      [user.id]
    );
    if (!credRes.rows[0]) {
      console.log('No credentials found.');
      return;
    }
    
    const credentials = JSON.parse(decrypt(credRes.rows[0].encrypted_data));
    const token = credentials['GITHUB_TOKEN'];
    if (!token) {
      console.log('GITHUB_TOKEN not found.');
      return;
    }

    console.log(`Using GITHUB_TOKEN starting with: ${token.substring(0, 8)}...`);

    // 3. Send PUT request to merge PR #2 in RPS
    const owner = 'chgyaneswar2004';
    const repo = 'RPS';
    const prNumber = 2;

    const postData = JSON.stringify({
      merge_method: 'merge',
      commit_title: `Merge PR #${prNumber} via PR-Insight Test`,
      commit_message: `Merged automatically via test script.`
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'PR-Insight-Merge-Tester',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`Sending PUT to: https://api.github.com${options.path}`);

    const req = https.request(options, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));

      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        console.log('Response Body:', body);
        process.exit(0);
      });
    });

    req.on('error', (err) => {
      console.error('Request Error:', err.message);
      process.exit(1);
    });

    req.write(postData);
    req.end();

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testMerge();
