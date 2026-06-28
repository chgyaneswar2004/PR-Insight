import express from 'express';
import crypto from 'crypto';
import * as db from '../db/client.js';
import { requireAuth } from '../middleware/authenticate.js';
import { saveUserCredential } from '../services/credentialsManager.js';

const router = express.Router();

// How to create a GitHub OAuth App:
// 1. Go to github.com → Settings → Developer Settings → OAuth Apps → New OAuth App
// 2. Application name: PR Insight
// 3. Homepage URL: your APP_URL
// 4. Authorization callback URL: APP_URL/auth/github/callback
// 5. Copy Client ID and Client Secret into environment variables

router.get('/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600000 }); // 10 mins

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL || 'http://localhost:3001'}/auth/github/callback`,
    scope: 'read:user user:email repo',
    state: state
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies?.oauth_state;

  if (cookieState && state !== cookieState) {
    return res.status(400).send('State validation failed. Potential CSRF attack.');
  }
  res.clearCookie('oauth_state');

  if (!code) {
    return res.status(400).send('Authorization code missing.');
  }

  try {
    // Step 1 — Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json', 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    
    if (!tokenRes.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) {
      throw new Error(`GitHub oauth did not return access token: ${JSON.stringify(tokenData)}`);
    }

    // Step 2 — Fetch GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${access_token}`, 
        'User-Agent': 'PR-Insight' 
      }
    });
    
    if (!userRes.ok) {
      throw new Error(`GitHub user fetch failed: ${userRes.statusText}`);
    }

    const githubUser = await userRes.json();

    // Fetch user email if not in profile
    let email = githubUser.email;
    if (!email) {
      try {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { 
            'Authorization': `Bearer ${access_token}`, 
            'User-Agent': 'PR-Insight' 
          }
        });
        if (emailRes.ok) {
          const emails = await emailRes.json();
          const primaryEmail = emails.find(e => e.primary);
          email = primaryEmail ? primaryEmail.email : (emails[0]?.email || null);
        }
      } catch (err) {
        console.warn('Failed to fetch github user emails:', err);
      }
    }

    // Step 3 — Check if this is the very first user
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;

    // Step 4 — Upsert user record
    const result = await db.query(`
      INSERT INTO users (github_id, username, display_name, avatar_url, email, role, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (github_id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        email = COALESCE(users.email, EXCLUDED.email),
        last_login = NOW()
      RETURNING *
    `, [
      githubUser.id.toString(),
      githubUser.login,
      githubUser.name || githubUser.login,
      githubUser.avatar_url,
      email,
      isFirstUser ? 'admin' : 'member'
    ]);
    const user = result.rows[0];

    // Step 5 — Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.query(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, sessionToken, expiresAt]);

    // Step 6 — Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    });

    // Step 7 — Save GitHub OAuth token as first credential
    await saveUserCredential(user.id, 'GITHUB_TOKEN', access_token);

    // Step 8 — Redirect based on setup status
    // In development, the client is on http://localhost:5173. In production, same domain.
    const clientUrl = process.env.FRONTEND_URL || 
      (process.env.NODE_ENV === 'production'
        ? (process.env.APP_URL || 'http://localhost:3001')
        : 'http://localhost:5173');

    if (user.setup_complete) {
      res.redirect(`${clientUrl}/`);
    } else {
      res.redirect(`${clientUrl}/setup/llm`); // GitHub token already saved, skip that step
    }
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  res.json({
    id: req.user.id,
    username: req.user.username,
    displayName: req.user.display_name,
    avatarUrl: req.user.avatar_url,
    role: req.user.role,
    setupComplete: req.user.setup_complete,
    githubAppUrl: process.env.GITHUB_APP_URL || 'https://github.com/apps/pr-insight'
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM sessions WHERE token = $1', [req.cookies.session]);
  } catch (err) {
    console.error('Logout db clean error:', err);
  }
  res.clearCookie('session');
  res.json({ success: true });
});

export default router;
