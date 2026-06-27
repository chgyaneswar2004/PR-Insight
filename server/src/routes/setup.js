import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authenticate.js';
import { saveUserCredentials, markUserSetupComplete, getUserCredentials } from '../services/credentialsManager.js';
import * as db from '../db/client.js';

const router = express.Router();

router.get('/credentials', requireAuth, async (req, res) => {
  try {
    const credentials = await getUserCredentials(req.user.id);
    res.json(credentials);
  } catch (err) {
    console.error('Fetch credentials error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', requireAuth, async (req, res) => {
  res.json({ complete: req.user.setup_complete });
});

router.post('/test/llm', requireAuth, async (req, res) => {
  const { tier, geminiApiKey, nvidiaApiKey, paidProvider, paidApiKey } = req.body;

  try {
    if (tier === 'free') {
      // Test Gemini
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
      );
      if (!geminiRes.ok) {
        return res.json({ success: false, field: 'gemini', error: 'Invalid Gemini API key' });
      }

      // Test NVIDIA NIM
      const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: { Authorization: `Bearer ${nvidiaApiKey}` }
      });
      if (!nvidiaRes.ok) {
        return res.json({ success: false, field: 'nvidia', error: 'Invalid NVIDIA NIM API key' });
      }

      return res.json({ success: true, tier: 'free' });
    }

    if (tier === 'paid') {
      const baseMap = {
        openai: 'https://api.openai.com/v1/models',
        gemini_pro: `https://generativelanguage.googleapis.com/v1beta/models?key=${paidApiKey}`,
        deepseek: 'https://api.deepseek.com/v1/models'
      };

      const url = baseMap[paidProvider];
      if (!url) {
        return res.json({ success: false, error: 'Invalid paid provider' });
      }
      
      const headers = paidProvider !== 'gemini_pro'
        ? { Authorization: `Bearer ${paidApiKey}` }
        : {};

      const r = await fetch(url, { headers });
      if (!r.ok) {
        return res.json({ success: false, error: 'Invalid API key' });
      }

      return res.json({ success: true, tier: 'paid' });
    }

    res.json({ success: false, error: 'Invalid tier specified' });

  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post('/save', requireAuth, async (req, res) => {
  try {
    const { 
      llmProvider, 
      llmApiKey, 
      smtpServer, 
      smtpPort, 
      smtpUsername, 
      smtpPassword, 
      notificationEmails, 
      emailEnabled,
      // Tiered credentials fields
      LLM_TIER,
      GEMINI_API_KEY,
      NVIDIA_API_KEY,
      CODE_SUMMARY_MODEL,
      PR_SUMMARY_MODEL,
      CODE_REVIEW_MODEL,
      OPENAI_API_BASE,
      THROTTLE_ENABLED,
      OPENAI_API_KEY
    } = req.body;
    
    const credentials = {};
    
    if (llmProvider) credentials['LLM_PROVIDER'] = llmProvider;
    if (llmApiKey) credentials['LLM_API_KEY'] = llmApiKey;
    if (smtpServer) credentials['SMTP_SERVER'] = smtpServer;
    if (smtpPort !== undefined && smtpPort !== null) credentials['SMTP_PORT'] = smtpPort.toString();
    if (smtpUsername) credentials['SMTP_USERNAME'] = smtpUsername;
    if (smtpPassword) credentials['SMTP_PASSWORD'] = smtpPassword;
    if (notificationEmails) credentials['NOTIFICATION_EMAILS'] = notificationEmails;
    if (emailEnabled !== undefined) credentials['EMAIL_ENABLED'] = emailEnabled ? 'true' : 'false';
    
    // Merge new tiered credentials fields
    if (LLM_TIER) credentials['LLM_TIER'] = LLM_TIER;
    if (GEMINI_API_KEY) credentials['GEMINI_API_KEY'] = GEMINI_API_KEY;
    if (NVIDIA_API_KEY) credentials['NVIDIA_API_KEY'] = NVIDIA_API_KEY;
    if (CODE_SUMMARY_MODEL) credentials['CODE_SUMMARY_MODEL'] = CODE_SUMMARY_MODEL;
    if (PR_SUMMARY_MODEL) credentials['PR_SUMMARY_MODEL'] = PR_SUMMARY_MODEL;
    if (CODE_REVIEW_MODEL) credentials['CODE_REVIEW_MODEL'] = CODE_REVIEW_MODEL;
    if (OPENAI_API_BASE) credentials['OPENAI_API_BASE'] = OPENAI_API_BASE;
    if (THROTTLE_ENABLED) credentials['THROTTLE_ENABLED'] = THROTTLE_ENABLED;
    if (OPENAI_API_KEY) credentials['OPENAI_API_KEY'] = OPENAI_API_KEY;
    
    await saveUserCredentials(req.user.id, credentials);
    await markUserSetupComplete(req.user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Setup save error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('UPDATE users SET setup_complete = FALSE WHERE id = $1', [userId]);
    await db.query('DELETE FROM user_credentials WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Setup reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
