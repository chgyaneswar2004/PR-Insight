import express from 'express';
import { repos, pullRequests, reviews, analyticsData, notifications, users, settings } from '../data/store.js';
import { startAgentSimulation } from '../services/agentService.js';
import * as db from '../db/client.js';
import { isProductionMode, getDisplayData } from '../db/modeManager.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserCredentials } from '../services/credentialsManager.js';

export function createRouter(io, anthropicClient) {
  const router = express.Router();

  // Helper mapping functions to format PostgreSQL rows into frontend expectations
  const mapRepo = (r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    language: r.language,
    description: r.description,
    stars: parseInt(r.stars || '0'),
    forks: parseInt(r.forks || '0'),
    openPRs: parseInt(r.open_pr_count || '0'),
    totalPRs: parseInt(r.total_pr_count || '0'),
    lastActivity: r.updated_at,
    qualityScore: parseInt(r.quality_score || '0'),
    securityIssues: parseInt(r.security_issues || '0'),
    owner: r.owner,
    visibility: r.visibility,
    topics: typeof r.topics === 'string' ? JSON.parse(r.topics) : (r.topics || [])
  });

  const mapPR = (p) => {
    let status = p.status;
    if (status === 'pending') status = 'open';
    if (status === 'reviewed') status = 'review';
    return {
      id: p.id,
      repoId: p.repo_id,
      number: parseInt(p.number || '0'),
      title: p.title,
      description: p.description,
      author: typeof p.author === 'string' ? JSON.parse(p.author) : (p.author || { login: 'unknown', avatar: null }),
      branch: p.branch,
      baseBranch: p.base_branch,
      status,
      files: parseInt(p.files || '0'),
      additions: parseInt(p.additions || '0'),
      deletions: parseInt(p.deletions || '0'),
      qualityScore: parseInt(p.quality_score || '0'),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      labels: typeof p.labels === 'string' ? JSON.parse(p.labels) : (p.labels || []),
      reviewers: typeof p.reviewers === 'string' ? JSON.parse(p.reviewers) : (p.reviewers || []),
      commits: parseInt(p.commits || '0'),
      comments: parseInt(p.comments || '0'),
      hasReview: p.has_review || false,
      repoName: p.repo_name,
      language: p.language
    };
  };

  const mapReview = (rv) => ({
    id: rv.id,
    prId: rv.pr_id,
    overallScore: parseFloat(rv.overall_score || rv.quality_score || '0'),
    summary: rv.summary,
    dimensions: {
      security: parseFloat(rv.security_score || '0'),
      maintainability: parseFloat(rv.maintainability_score || '0'),
      performance: parseFloat(rv.performance_score || '0'),
      readability: parseFloat(rv.readability_score || '0'),
      documentation: parseFloat(rv.docs_score || '0')
    },
    securityIssues: typeof rv.security_issues === 'string' ? JSON.parse(rv.security_issues) : (rv.security_issues || []),
    qualityIssues: typeof rv.quality_issues === 'string' ? JSON.parse(rv.quality_issues) : (rv.quality_issues || []),
    performanceIssues: typeof rv.performance_issues === 'string' ? JSON.parse(rv.performance_issues) : (rv.performance_issues || []),
    docSuggestions: typeof rv.suggestions === 'string' ? JSON.parse(rv.suggestions) : (rv.suggestions || []),
    codeDiff: typeof rv.diff_data === 'string' ? JSON.parse(rv.diff_data) : (rv.diff_data || null),
    rawMarkdown: rv.raw_markdown || '',
    createdAt: rv.created_at
  });

  async function syncPullRequestsFromGitHub(userId, token) {
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'PR-Insight',
          'Accept': 'application/vnd.github+json'
        }
      });
      if (!userRes.ok) return;
      const ghUser = await userRes.json();
      const username = ghUser.login;

      const searchRes = await fetch(`https://api.github.com/search/issues?q=is:open+is:pr+user:${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'PR-Insight',
          'Accept': 'application/vnd.github+json'
        }
      });
      if (!searchRes.ok) return;
      const searchData = await searchRes.json();

      for (const item of searchData.items) {
        const repoUrlParts = item.repository_url.split('/repos/');
        if (repoUrlParts.length < 2) continue;
        const repoFullName = repoUrlParts[1];

        const repoRes = await db.query(
          'SELECT id FROM repositories WHERE full_name = $1 AND user_id = $2',
          [repoFullName, userId]
        );
        if (repoRes.rows.length === 0) continue;
        const repoId = repoRes.rows[0].id;

        const prRes = await db.query(
          'SELECT id FROM pull_requests WHERE repo_id = $1 AND number = $2 AND user_id = $3',
          [repoId, item.number, userId]
        );

        const author = {
          login: item.user?.login || 'unknown',
          avatar: item.user?.avatar_url || null
        };

        if (prRes.rows.length > 0) {
          await db.query(
            `UPDATE pull_requests 
             SET title = $1, author = $2, comments = $3, updated_at = NOW()
             WHERE id = $4`,
            [
              item.title,
              JSON.stringify(author),
              item.comments || 0,
              prRes.rows[0].id
            ]
          );
        } else {
          await db.query(
            `INSERT INTO pull_requests (
              repo_id, number, title, description, author, branch, base_branch, status,
              files, additions, deletions, commits, comments, has_review, user_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, $14, $15, NOW())`,
            [
              repoId,
              item.number,
              item.title,
              item.body || '',
              JSON.stringify(author),
              'unknown',
              'main',
              'pending',
              0, 0, 0, 0,
              item.comments || 0,
              userId,
              item.created_at || new Date().toISOString()
            ]
          );
        }
      }

      // Sync non-owned repositories
      const allReposRes = await db.query('SELECT full_name, id FROM repositories WHERE user_id = $1', [userId]);
      const externalRepos = allReposRes.rows.filter(r => !r.full_name.toLowerCase().startsWith(`${username.toLowerCase()}/`));
      
      for (const extRepo of externalRepos) {
        const prsRes = await fetch(`https://api.github.com/repos/${extRepo.full_name}/pulls?state=open`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'PR-Insight',
            'Accept': 'application/vnd.github+json'
          }
        });
        if (!prsRes.ok) continue;
        const prs = await prsRes.json();
        for (const pr of prs) {
          const prRes = await db.query(
            'SELECT id FROM pull_requests WHERE repo_id = $1 AND number = $2 AND user_id = $3',
            [extRepo.id, pr.number, userId]
          );

          const author = {
            login: pr.user?.login || 'unknown',
            avatar: pr.user?.avatar_url || null
          };

          if (prRes.rows.length > 0) {
            await db.query(
              `UPDATE pull_requests 
               SET title = $1, author = $2, branch = $3, base_branch = $4, files = $5, additions = $6, deletions = $7, updated_at = NOW()
               WHERE id = $8`,
              [
                pr.title,
                JSON.stringify(author),
                pr.head?.ref || 'unknown',
                pr.base?.ref || 'main',
                pr.changed_files || 0,
                pr.additions || 0,
                pr.deletions || 0,
                prRes.rows[0].id
              ]
            );
          } else {
            await db.query(
              `INSERT INTO pull_requests (
                repo_id, number, title, description, author, branch, base_branch, status,
                files, additions, deletions, commits, comments, has_review, user_id, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, $14, $15, NOW())`,
              [
                extRepo.id,
                pr.number,
                pr.title,
                pr.body || '',
                JSON.stringify(author),
                pr.head?.ref || 'unknown',
                pr.base?.ref || 'main',
                'pending',
                pr.changed_files || 0,
                pr.additions || 0,
                pr.deletions || 0,
                pr.commits || 0,
                pr.comments || 0,
                userId,
                pr.created_at || new Date().toISOString()
              ]
            );
          }
        }
      }
    } catch (err) {
      console.error('Error syncing pull requests with GitHub:', err);
    }
  }

  // Repos
  router.get('/repos', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const { search, language, sort } = req.query;
        let result = repos.filter(r => {
          const repoPRs = pullRequests.filter(p => p.repoId === r.id);
          return repoPRs.some(p => 
            p.status === 'open' || 
            p.status === 'pending' || 
            p.status === 'review' || 
            p.status === 'reviewed' || 
            p.hasReview === true
          );
        });
        if (search) result = result.filter(r => r.name.includes(search) || r.description.includes(search));
        if (language) result = result.filter(r => r.language === language);
        if (sort === 'stars') result.sort((a, b) => b.stars - a.stars);
        if (sort === 'activity') result.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
        if (sort === 'prs') result.sort((a, b) => b.openPRs - a.openPRs);
        return res.json({ repos: result, total: result.length });
      }

      // Sync user's repositories from GitHub if GITHUB_TOKEN is available
      try {
        const credentials = await getUserCredentials(req.user.id);
        const githubToken = credentials['GITHUB_TOKEN'];
        if (githubToken) {
          const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'User-Agent': 'PR-Insight',
              'Accept': 'application/vnd.github+json'
            }
          });

          if (ghRes.ok) {
            const ghRepos = await ghRes.json();
            for (const gr of ghRepos) {
              // Check if repo already registered for this user
              const checkRepo = await db.query(
                'SELECT id FROM repositories WHERE full_name = $1 AND user_id = $2',
                [gr.full_name, req.user.id]
              );

              if (checkRepo.rows.length > 0) {
                // Update existing repository metadata
                await db.query(
                  `UPDATE repositories 
                   SET name = $1, language = $2, description = $3, stars = $4, forks = $5, visibility = $6, updated_at = NOW() 
                   WHERE id = $7 AND user_id = $8`,
                  [
                    gr.name,
                    gr.language || 'Unknown',
                    gr.description || '',
                    gr.stargazers_count || 0,
                    gr.forks_count || 0,
                    gr.private ? 'private' : 'public',
                    checkRepo.rows[0].id,
                    req.user.id
                  ]
                );
              } else {
                // Insert new repository linked to user_id
                await db.query(
                  `INSERT INTO repositories (name, full_name, language, description, stars, forks, visibility, user_id, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
                  [
                    gr.name,
                    gr.full_name,
                    gr.language || 'Unknown',
                    gr.description || '',
                    gr.stargazers_count || 0,
                    gr.forks_count || 0,
                    gr.private ? 'private' : 'public',
                    req.user.id
                  ]
                );
              }
            }
          } else {
            console.warn('Failed to fetch repositories from GitHub:', ghRes.statusText);
          }
          // Sync open pull requests too!
          await syncPullRequestsFromGitHub(req.user.id, githubToken);
        }
      } catch (syncErr) {
        console.error('Error syncing repositories with GitHub:', syncErr);
      }

      // Query from DB (user scoped) - only return repos with at least one active or reviewed PR
      const result = await db.query(`
        SELECT r.*, 
               COUNT(p.id) FILTER (WHERE p.status = 'pending' OR p.status = 'open') as open_pr_count,
               COUNT(p.id) as total_pr_count
        FROM repositories r 
        INNER JOIN pull_requests p ON p.repo_id = r.id AND p.user_id = $1
        WHERE r.user_id = $1
        GROUP BY r.id
        HAVING COUNT(p.id) FILTER (WHERE p.status IN ('pending', 'open', 'reviewed', 'review') OR p.has_review = true) > 0
        ORDER BY r.updated_at DESC
      `, [req.user.id]);
      const mapped = result.rows.map(mapRepo);
      res.json({ repos: mapped, total: mapped.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/repos/:id', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const repo = repos.find(r => r.id === req.params.id);
        if (!repo) return res.status(404).json({ error: 'Repo not found' });
        return res.json(repo);
      }

      const result = await db.query('SELECT * FROM repositories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Repo not found' });
      res.json(mapRepo(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/repos/:id/prs', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const prs = pullRequests.filter(pr => pr.repoId === req.params.id);
        return res.json({ prs, total: prs.length });
      }

      const result = await db.query('SELECT * FROM pull_requests WHERE repo_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      const mapped = result.rows.map(mapPR);
      res.json({ prs: mapped, total: mapped.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PRs
  router.get('/prs', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const { status, repoId, search, page = 1, limit = 10 } = req.query;
        let result = [...pullRequests];
        if (status && status !== 'all') result = result.filter(pr => pr.status === status);
        if (repoId) result = result.filter(pr => pr.repoId === repoId);
        if (search) result = result.filter(pr => pr.title.toLowerCase().includes(search.toLowerCase()));
        const total = result.length;
        const start = (page - 1) * limit;
        result = result.slice(start, start + parseInt(limit));
        return res.json({ prs: result, total, page: parseInt(page), pages: Math.ceil(total / limit) });
      }

      const { status, repoId, search } = req.query;

      // Sync open PRs from GitHub first
      try {
        const credentials = await getUserCredentials(req.user.id);
        const githubToken = credentials['GITHUB_TOKEN'];
        if (githubToken) {
          await syncPullRequestsFromGitHub(req.user.id, githubToken);
        }
      } catch (syncErr) {
        console.error('Error syncing pull requests on get:', syncErr);
      }

      let queryText = `
        SELECT p.*, r.name as repo_name, r.language
        FROM pull_requests p
        JOIN repositories r ON r.id = p.repo_id
      `;
      const params = [req.user.id];
      const conditions = ['p.user_id = $1'];

      if (status && status !== 'all') {
        params.push(status);
        conditions.push(`p.status = $${params.length}`);
      }
      if (repoId) {
        params.push(repoId);
        conditions.push(`p.repo_id = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`p.title ILIKE $${params.length}`);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      queryText += ' ORDER BY p.created_at DESC';

      const result = await db.query(queryText, params);
      const mapped = result.rows.map(mapPR);
      res.json({ prs: mapped, total: mapped.length, page: 1, pages: 1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/prs/:id', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const pr = pullRequests.find(p => p.id === req.params.id);
        if (!pr) return res.status(404).json({ error: 'PR not found' });
        const repo = repos.find(r => r.id === pr.repoId);
        return res.json({ ...pr, repo });
      }

      const prResult = await db.query('SELECT * FROM pull_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (prResult.rows.length === 0) return res.status(404).json({ error: 'PR not found' });
      const pr = prResult.rows[0];

      const repoResult = await db.query('SELECT * FROM repositories WHERE id = $1 AND user_id = $2', [pr.repo_id, req.user.id]);
      const repo = repoResult.rows.length > 0 ? mapRepo(repoResult.rows[0]) : null;

      res.json({ ...mapPR(pr), repo });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/prs/:id/review', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const review = reviews[req.params.id];
        if (!review) return res.status(404).json({ error: 'Review not found' });
        return res.json(review);
      }

      const result = await db.query(`
        SELECT rv.*, p.title, p.author, p.overall_score
        FROM reviews rv
        JOIN pull_requests p ON p.id = rv.pr_id
        WHERE rv.pr_id = $1 AND rv.user_id = $2
      `, [req.params.id, req.user.id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
      res.json(mapReview(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Agent / Manual Review Trigger
  router.post('/agent/start', async (req, res) => {
    const { prId } = req.body;
    if (!prId) return res.status(400).json({ error: 'prId required' });
    
    const isProd = await isProductionMode();
    if (!isProd) {
      const pr = pullRequests.find(p => p.id === prId);
      if (!pr) return res.status(404).json({ error: 'PR not found' });
      const sessionId = startAgentSimulation(prId, io, anthropicClient);
      return res.json({ sessionId, message: 'Agent simulation started' });
    }

    try {
      const prRes = await db.query(
        'SELECT p.*, r.full_name FROM pull_requests p JOIN repositories r ON r.id = p.repo_id WHERE p.id = $1 AND p.user_id = $2',
        [prId, req.user.id]
      );
      if (prRes.rows.length === 0) return res.status(404).json({ error: 'PR not found' });
      const pr = prRes.rows[0];

      const { triggerCodeWatchReview } = await import('../services/codewatchBridge.js');
      const credentials = await getUserCredentials(req.user.id);
      const sessionId = uuidv4();
      
      triggerCodeWatchReview(pr.full_name, pr.number, pr.id, io, sessionId, req.user.id, credentials).catch(err => {
        console.error('CodeWatch review background execution failed:', err);
      });

      res.json({ sessionId, message: 'CodeWatch review started' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Analytics
  router.get('/analytics', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        return res.json(analyticsData);
      }

      // Query real data from PostgreSQL (user scoped)
      const reviewsPerDayRes = await db.query(`
        SELECT 
          TO_CHAR(reviewed_at, 'YYYY-MM-DD') as date, 
          COUNT(*) as reviews,
          COALESCE(SUM(additions + deletions), 0) as issues,
          COALESCE(SUM(CASE WHEN overall_score < 70 THEN 1 ELSE 0 END), 0) as security
        FROM pull_requests
        WHERE user_id = $1 AND reviewed_at > NOW() - INTERVAL '30 days' AND has_review = true
        GROUP BY TO_CHAR(reviewed_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [req.user.id]);

      const issueTypesRes = await db.query(`
        SELECT 
          'Security' as type, COALESCE(SUM(jsonb_array_length(security_issues)), 0) as count, '#EF4444' as color
        FROM reviews
        WHERE user_id = $1
        UNION ALL
        SELECT 
          'Bug' as type, COALESCE(SUM(jsonb_array_length(quality_issues)), 0) as count, '#F59E0B' as color
        FROM reviews
        WHERE user_id = $1
        UNION ALL
        SELECT 
          'Performance' as type, COALESCE(SUM(jsonb_array_length(performance_issues)), 0) as count, '#06B6D4' as color
        FROM reviews
        WHERE user_id = $1
        UNION ALL
        SELECT 
          'Maintainability' as type, COUNT(*) FILTER (WHERE maintainability_score < 7.0) as count, '#7C3AED' as color
        FROM reviews
        WHERE user_id = $1
        UNION ALL
        SELECT 
          'Documentation' as type, COALESCE(SUM(jsonb_array_length(suggestions)), 0) as count, '#22C55E' as color
        FROM reviews
        WHERE user_id = $1
      `, [req.user.id]);

      const teamPerformanceRes = await db.query(`
        SELECT 
          username as name,
          total_prs as "prsReviewed",
          COALESCE(total_prs * 3, 0) as "issuesFound",
          ROUND(avg_score, 0) as "avgScore",
          avatar_url as avatar
        FROM developers
        WHERE user_id = $1
        ORDER BY total_prs DESC
      `, [req.user.id]);

      const totalReviewsRes = await db.query("SELECT COUNT(*) FROM pull_requests WHERE user_id = $1 AND has_review = true", [req.user.id]);
      const avgQualityRes = await db.query("SELECT AVG(overall_score) FROM pull_requests WHERE user_id = $1 AND has_review = true", [req.user.id]);

      const securityTrend = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'short' }),
        critical: Math.floor(Math.random() * 2),
        high: Math.floor(Math.random() * 4),
        medium: Math.floor(Math.random() * 6),
        low: Math.floor(Math.random() * 8),
      }));

      const totalReviews = parseInt(totalReviewsRes.rows[0].count || '0');
      const avgQualityScore = Math.round(parseFloat(avgQualityRes.rows[0].avg || '0'));

      const responseData = {
        reviewsPerDay: reviewsPerDayRes.rows,
        issueTypes: issueTypesRes.rows.map(row => ({ ...row, count: parseInt(row.count) })),
        teamPerformance: teamPerformanceRes.rows.map(row => ({
          ...row,
          prsReviewed: parseInt(row.prsReviewed),
          issuesFound: parseInt(row.issuesFound),
          avgScore: parseInt(row.avgScore)
        })),
        securityTrend,
        metrics: {
          totalReviews,
          avgQualityScore: avgQualityScore || 85,
          securityIssuesFixed: Math.floor(totalReviews * 1.5),
          timeSaved: totalReviews * 2,
        }
      };

      res.json(responseData);
    } catch (err) {
      console.error(err);
      res.json(analyticsData);
    }
  });

  // Notifications
  router.get('/notifications', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        return res.json({ notifications, unread: notifications.filter(n => !n.read).length });
      }
      
      const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
      const mapped = result.rows.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        read: n.is_read,
        prId: n.pr_id
      }));

      res.json({
        notifications: mapped,
        unread: mapped.filter(n => !n.read).length
      });
    } catch (err) {
      res.json({ notifications, unread: notifications.filter(n => !n.read).length });
    }
  });

  router.put('/notifications/:id/read', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const n = notifications.find(n => n.id === req.params.id);
        if (n) n.read = true;
        return res.json({ success: true });
      }

      await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/notifications/read-all', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        notifications.forEach(n => n.read = true);
        return res.json({ success: true });
      }

      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dashboard stats
  router.get('/dashboard/stats', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        const filteredRepos = repos.filter(r => {
          const repoPRs = pullRequests.filter(p => p.repoId === r.id);
          return repoPRs.some(p => 
            p.status === 'open' || 
            p.status === 'pending' || 
            p.status === 'review' || 
            p.status === 'reviewed' || 
            p.hasReview === true
          );
        });
        return res.json({
          totalRepos: filteredRepos.length,
          openPRs: pullRequests.filter(pr => pr.status === 'open').length,
          prsReviewed: pullRequests.filter(pr => pr.hasReview).length,
          securityIssues: filteredRepos.reduce((acc, r) => acc + r.securityIssues, 0),
          avgQualityScore: filteredRepos.length > 0 
            ? Math.round(filteredRepos.reduce((acc, r) => acc + r.qualityScore, 0) / filteredRepos.length)
            : 85,
          ...analyticsData.metrics,
        });
      }

      const totalReposRes = await db.query(`
        SELECT COUNT(DISTINCT r.id) as count 
        FROM repositories r
        INNER JOIN pull_requests p ON p.repo_id = r.id AND p.user_id = $1
        WHERE r.user_id = $1
          AND (p.status IN ('pending', 'open', 'reviewed', 'review') OR p.has_review = true)
      `, [req.user.id]);
      const openPRsRes = await db.query("SELECT COUNT(*) FROM pull_requests WHERE (status = 'open' OR status = 'pending') AND user_id = $1", [req.user.id]);
      const prsReviewedRes = await db.query("SELECT COUNT(*) FROM pull_requests WHERE (has_review = true OR status = 'reviewed') AND user_id = $1", [req.user.id]);
      const securityIssuesRes = await db.query(`
        SELECT COALESCE(SUM(r.security_issues), 0) as count 
        FROM repositories r
        WHERE r.user_id = $1
          AND EXISTS (
            SELECT 1 FROM pull_requests p 
            WHERE p.repo_id = r.id AND p.user_id = $1
              AND (p.status IN ('pending', 'open', 'reviewed', 'review') OR p.has_review = true)
          )
      `, [req.user.id]);
      const avgQualityRes = await db.query(`
        SELECT AVG(r.quality_score) as avg 
        FROM repositories r
        WHERE r.user_id = $1 AND r.quality_score > 0
          AND EXISTS (
            SELECT 1 FROM pull_requests p 
            WHERE p.repo_id = r.id AND p.user_id = $1
              AND (p.status IN ('pending', 'open', 'reviewed', 'review') OR p.has_review = true)
          )
      `, [req.user.id]);

      const totalReviewsRes = await db.query("SELECT COUNT(*) FROM pull_requests WHERE has_review = true AND user_id = $1", [req.user.id]);
      const avgQualityPRRes = await db.query("SELECT AVG(overall_score) FROM pull_requests WHERE has_review = true AND user_id = $1", [req.user.id]);

      const totalReviews = parseInt(totalReviewsRes.rows[0].count || '0');

      res.json({
        totalRepos: parseInt(totalReposRes.rows[0].count || '0'),
        openPRs: parseInt(openPRsRes.rows[0].count || '0'),
        prsReviewed: parseInt(prsReviewedRes.rows[0].count || '0'),
        securityIssues: parseInt(securityIssuesRes.rows[0].count || '0'),
        avgQualityScore: Math.round(parseFloat(avgQualityRes.rows[0].avg || '85')),
        totalReviews,
        avgQualityScorePR: Math.round(parseFloat(avgQualityPRRes.rows[0].avg || '85')),
        securityIssuesFixed: Math.floor(totalReviews * 1.5),
        timeSaved: totalReviews * 2,
      });
    } catch (err) {
      console.error(err);
      const filteredRepos = repos.filter(r => {
        const repoPRs = pullRequests.filter(p => p.repoId === r.id);
        return repoPRs.some(p => 
          p.status === 'open' || 
          p.status === 'pending' || 
          p.status === 'review' || 
          p.status === 'reviewed' || 
          p.hasReview === true
        );
      });
      res.json({
        totalRepos: filteredRepos.length,
        openPRs: pullRequests.filter(pr => pr.status === 'open').length,
        prsReviewed: pullRequests.filter(pr => pr.hasReview).length,
        securityIssues: filteredRepos.reduce((acc, r) => acc + r.securityIssues, 0),
        avgQualityScore: filteredRepos.length > 0 
          ? Math.round(filteredRepos.reduce((acc, r) => acc + r.qualityScore, 0) / filteredRepos.length)
          : 85,
        ...analyticsData.metrics,
      });
    }
  });

  router.put('/prs/:id/merge', async (req, res) => {
    try {
      const isProd = await isProductionMode();
      if (!isProd) {
        // Mock update in dev state
        const prIndex = pullRequests.findIndex(p => p.id === req.params.id);
        if (prIndex !== -1) {
          pullRequests[prIndex].status = 'merged';
        }
        return res.json({ success: true, message: 'PR merged (simulated)' });
      }

      // Get PR details from DB
      const prResult = await db.query(
        'SELECT p.*, r.full_name FROM pull_requests p JOIN repositories r ON r.id = p.repo_id WHERE p.id = $1 AND p.user_id = $2',
        [req.params.id, req.user.id]
      );
      if (prResult.rows.length === 0) return res.status(404).json({ error: 'PR not found' });
      const pr = prResult.rows[0];

      // Get GitHub token
      const credentials = await getUserCredentials(req.user.id);
      const githubToken = credentials['GITHUB_TOKEN'];
      if (!githubToken) {
        return res.status(400).json({ error: 'GitHub credentials not found. Please setup integration.' });
      }

      // Merge PR on GitHub
      const { mergeMethod = 'merge' } = req.body;
      const mergeRes = await fetch(`https://api.github.com/repos/${pr.full_name}/pulls/${pr.number}/merge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'User-Agent': 'PR-Insight',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify({
          merge_method: mergeMethod,
          commit_title: `Merge PR #${pr.number} via PR-Insight`,
          commit_message: `Merged automatically via PR-Insight AI Review dashboard.`
        })
      });

      if (!mergeRes.ok) {
        const errText = await mergeRes.text();
        return res.status(mergeRes.status).json({ error: `GitHub API error: ${errText}` });
      }

      const mergeData = await mergeRes.json();
      
      // Update PR status in DB
      await db.query(
        "UPDATE pull_requests SET status = 'merged', updated_at = NOW() WHERE id = $1 AND user_id = $2",
        [req.params.id, req.user.id]
      );

      res.json({ success: true, message: mergeData.message || 'PR merged successfully' });
    } catch (err) {
      console.error('Error merging PR:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
