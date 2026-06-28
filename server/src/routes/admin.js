import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authenticate.js';
import * as db from '../db/client.js';
import { decrypt } from '../utils/encryption.js';

const router = express.Router();

// GET /api/admin/users -> list all users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.*,
        uc.encrypted_data
      FROM users u
      LEFT JOIN user_credentials uc ON uc.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    
    // Map database fields to what frontend expects
    const mapped = result.rows.map(u => {
      let tier = '—';
      if (u.setup_complete && u.encrypted_data) {
        try {
          const creds = JSON.parse(decrypt(u.encrypted_data));
          tier = creds.LLM_TIER || 'unknown';
        } catch (decErr) {
          console.warn('Failed to decrypt credentials for visibility in admin users list:', u.id, decErr);
          tier = 'unknown';
        }
      }
      return {
        id: u.id,
        login: u.username,
        name: u.display_name || u.username,
        email: u.email || 'No email',
        role: u.role,
        avatar: u.avatar_url,
        joined: u.created_at,
        setupComplete: u.setup_complete,
        lastLogin: u.last_login,
        llmTier: tier
      };
    });
    
    res.json({ users: mapped, total: mapped.length });
  } catch (err) {
    console.error('Admin fetch users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/role -> change role
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'admin' | 'member'
    
    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'Invalid role. Must be admin or member.' });
    }

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin change role error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/reset -> reset their setup
router.post('/users/:id/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE users SET setup_complete = FALSE WHERE id = $1', [id]);
    await db.query('DELETE FROM user_credentials WHERE user_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reset user setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id -> revoke access (deletes user + all data due to cascade)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings -> get settings
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Default fallback settings
    const defaultSettings = {
      reviewRules: {
        autoMerge: false,
        blockOnCritical: true,
        minQualityScore: 80
      },
      severityThresholds: {
        critical: 25,
        high: 15,
        medium: 5,
        low: 1
      }
    };

    const result = await db.query("SELECT * FROM settings WHERE key = 'app_settings'");
    if (result.rows.length === 0) return res.json(defaultSettings);
    res.json(result.rows[0].value);
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings -> update settings
router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query(
      "INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
      ['app_settings', JSON.stringify(req.body)]
    );
    res.json({ success: true, settings: req.body });
  } catch (err) {
    console.error('Admin save settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
