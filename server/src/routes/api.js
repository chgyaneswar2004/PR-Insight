import express from 'express';
import { repos, pullRequests, reviews, analyticsData, notifications, users, settings } from '../data/store.js';
import { startAgentSimulation } from '../services/agentService.js';

export function createRouter(io, anthropicClient) {
  const router = express.Router();

  // Repos
  router.get('/repos', (req, res) => {
    const { search, language, sort } = req.query;
    let result = [...repos];
    if (search) result = result.filter(r => r.name.includes(search) || r.description.includes(search));
    if (language) result = result.filter(r => r.language === language);
    if (sort === 'stars') result.sort((a, b) => b.stars - a.stars);
    if (sort === 'activity') result.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    if (sort === 'prs') result.sort((a, b) => b.openPRs - a.openPRs);
    res.json({ repos: result, total: result.length });
  });

  router.get('/repos/:id', (req, res) => {
    const repo = repos.find(r => r.id === req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    res.json(repo);
  });

  router.get('/repos/:id/prs', (req, res) => {
    const prs = pullRequests.filter(pr => pr.repoId === req.params.id);
    res.json({ prs, total: prs.length });
  });

  // PRs
  router.get('/prs', (req, res) => {
    const { status, repoId, search, page = 1, limit = 10 } = req.query;
    let result = [...pullRequests];
    if (status && status !== 'all') result = result.filter(pr => pr.status === status);
    if (repoId) result = result.filter(pr => pr.repoId === repoId);
    if (search) result = result.filter(pr => pr.title.toLowerCase().includes(search.toLowerCase()));
    const total = result.length;
    const start = (page - 1) * limit;
    result = result.slice(start, start + parseInt(limit));
    res.json({ prs: result, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  });

  router.get('/prs/:id', (req, res) => {
    const pr = pullRequests.find(p => p.id === req.params.id);
    if (!pr) return res.status(404).json({ error: 'PR not found' });
    const repo = repos.find(r => r.id === pr.repoId);
    res.json({ ...pr, repo });
  });

  router.get('/prs/:id/review', (req, res) => {
    const review = reviews[req.params.id];
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  });

  // Agent
  router.post('/agent/start', (req, res) => {
    const { prId } = req.body;
    if (!prId) return res.status(400).json({ error: 'prId required' });
    const pr = pullRequests.find(p => p.id === prId);
    if (!pr) return res.status(404).json({ error: 'PR not found' });
    const sessionId = startAgentSimulation(prId, io, anthropicClient);
    res.json({ sessionId, message: 'Agent simulation started' });
  });

  // Analytics
  router.get('/analytics', (req, res) => {
    res.json(analyticsData);
  });

  // Notifications
  router.get('/notifications', (req, res) => {
    res.json({ notifications, unread: notifications.filter(n => !n.read).length });
  });

  router.put('/notifications/:id/read', (req, res) => {
    const n = notifications.find(n => n.id === req.params.id);
    if (n) n.read = true;
    res.json({ success: true });
  });

  router.put('/notifications/read-all', (req, res) => {
    notifications.forEach(n => n.read = true);
    res.json({ success: true });
  });

  // Admin
  router.get('/admin/users', (req, res) => {
    res.json({ users, total: users.length });
  });

  router.get('/admin/settings', (req, res) => {
    res.json(settings);
  });

  router.put('/admin/settings', (req, res) => {
    Object.assign(settings, req.body);
    res.json({ success: true, settings });
  });

  // Dashboard stats
  router.get('/dashboard/stats', (req, res) => {
    res.json({
      totalRepos: repos.length,
      openPRs: pullRequests.filter(pr => pr.status === 'open').length,
      prsReviewed: pullRequests.filter(pr => pr.hasReview).length,
      securityIssues: repos.reduce((acc, r) => acc + r.securityIssues, 0),
      avgQualityScore: Math.round(repos.reduce((acc, r) => acc + r.qualityScore, 0) / repos.length),
      ...analyticsData.metrics,
    });
  });

  return router;
}
