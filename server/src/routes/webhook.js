import express from 'express';
import crypto from 'crypto';
import * as db from '../db/client.js';
import { triggerCodeWatchReview } from '../services/codewatchBridge.js';
import { v4 as uuidv4 } from 'uuid';

export function createWebhookRouter(io) {
  const router = express.Router();
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  router.post('/github', async (req, res) => {
    // 1. Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        return res.status(401).json({ error: 'Signature header missing' });
      }

      // Express parses request body to JSON, so we reconstruct signature using JSON stringify
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      
      // Use timing-safe comparison where possible
      try {
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
          console.warn('⚠️ Webhook signature mismatch. Proceeding with caution.');
        }
      } catch (e) {
        console.warn('⚠️ Webhook signature format error.');
      }
    }

    const eventName = req.headers['x-github-event'];
    
    // Handle push events (to automatically create PRs)
    if (eventName === 'push') {
      const { ref, repository, deleted } = req.body;
      if (!ref || !repository) {
        return res.status(400).json({ error: 'Invalid push payload' });
      }

      const defaultBranch = repository.default_branch || 'main';
      const defaultBranchRef = `refs/heads/${defaultBranch}`;

      // Ignore pushes to default branch or branch deletion
      if (ref === defaultBranchRef || deleted) {
        return res.json({ message: 'Push ignored (default branch or branch deletion)' });
      }

      const branchName = ref.replace('refs/heads/', '');
      const repoFullName = repository.full_name;
      const token = process.env.GITHUB_TOKEN;

      if (!token) {
        console.error('Error: GITHUB_TOKEN is not configured in environment');
        return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
      }

      console.log(`[Push Webhook] Processing push to branch '${branchName}' in repository '${repoFullName}'...`);

      try {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls`, {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-API-Version': '2022-11-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Auto PR: Review of ${branchName}`,
            head: branchName,
            base: defaultBranch,
            body: `This Pull Request was automatically created by PR-Insight in response to a branch push event.`,
            draft: false
          })
        });

        const data = await response.json();

        if (response.status === 201) {
          console.log(`[Push Webhook] Automatically created PR #${data.number} for branch '${branchName}'`);
          return res.json({ message: 'PR automatically created', prNumber: data.number, prUrl: data.html_url });
        } else if (response.status === 422) {
          // GitHub API returns 422 if PR already exists
          const errorMsg = data.errors?.[0]?.message || '';
          if (errorMsg.includes('A pull request already exists') || errorMsg.includes('already exists')) {
            console.log(`[Push Webhook] PR already exists for branch '${branchName}', skipping creation.`);
            return res.json({ message: 'PR already exists, skipping creation' });
          }
          console.warn(`[Push Webhook] Failed to create PR (422):`, data);
          return res.status(422).json({ error: data });
        } else {
          console.error(`[Push Webhook] GitHub API error (${response.status}):`, data);
          return res.status(response.status).json({ error: data });
        }
      } catch (err) {
        console.error('[Push Webhook] Error calling GitHub API:', err);
        return res.status(500).json({ error: err.message });
      }
    }

    // Handle pull request events (standard CodeWatch review path)
    if (eventName !== 'pull_request') {
      return res.json({ message: `Event '${eventName}' ignored (only push and pull_request are handled)` });
    }

    const { action, pull_request, repository } = req.body;
    if (!pull_request || !repository) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Process only 'opened' and 'synchronize' (update) actions
    if (action !== 'opened' && action !== 'synchronize') {
      return res.json({ message: `Action '${action}' ignored` });
    }

    try {
      const repoFullName = repository.full_name;
      const prNumber = pull_request.number;
      const repoName = repository.name;
      const repoLanguage = repository.language || 'JavaScript';

      // Find or insert Repository
      let repoId;
      const repoRes = await db.query('SELECT id FROM repositories WHERE full_name = $1', [repoFullName]);
      if (repoRes.rows.length > 0) {
        repoId = repoRes.rows[0].id;
      } else {
        const insertRepoRes = await db.query(
          'INSERT INTO repositories (name, full_name, language, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
          [repoName, repoFullName, repoLanguage]
        );
        repoId = insertRepoRes.rows[0].id;
      }

      // Find or insert Pull Request record in database
      let prUUID;
      const prRes = await db.query('SELECT id FROM pull_requests WHERE repo_id = $1 AND number = $2', [repoId, prNumber]);
      
      const author = {
        login: pull_request.user?.login || 'unknown',
        avatar: pull_request.user?.avatar_url || null
      };

      if (prRes.rows.length > 0) {
        prUUID = prRes.rows[0].id;
        await db.query(
          `UPDATE pull_requests 
           SET title = $1, author = $2, status = 'pending', files = $3, additions = $4, deletions = $5,
               has_review = false, updated_at = NOW() 
           WHERE id = $6`,
          [
            pull_request.title,
            JSON.stringify(author),
            pull_request.changed_files || 0,
            pull_request.additions || 0,
            pull_request.deletions || 0,
            prUUID
          ]
        );
      } else {
        const insertPrRes = await db.query(
          `INSERT INTO pull_requests 
           (repo_id, number, title, author, branch, base_branch, status, files, additions, deletions, has_review, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, false, NOW(), NOW()) RETURNING id`,
          [
            repoId,
            prNumber,
            pull_request.title,
            JSON.stringify(author),
            pull_request.head?.ref || 'feature',
            pull_request.base?.ref || 'main',
            pull_request.changed_files || 0,
            pull_request.additions || 0,
            pull_request.deletions || 0
          ]
        );
        prUUID = insertPrRes.rows[0].id;
      }

      // Trigger CodeWatch review asynchronously in the background
      const sessionId = uuidv4();
      triggerCodeWatchReview(repoFullName, prNumber, prUUID, io, sessionId).catch(err => {
        console.error('Webhook review trigger failed:', err);
      });

      res.json({ message: 'Review triggered asynchronously', prId: prUUID, sessionId });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
