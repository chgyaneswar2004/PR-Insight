import * as db from './client.js';

export async function isProductionMode() {
  if (process.env.NODE_ENV === 'production' || process.env.FRONTEND_URL) {
    return true;
  }
  const REAL_DATA_THRESHOLD = parseInt(process.env.REAL_DATA_THRESHOLD || '10');
  try {
    // 1. Check if the one-way switch has already been flipped in the database
    const settingsRes = await db.query('SELECT value FROM settings WHERE key = $1', ['demo_mode_ended']);
    if (settingsRes.rows.length > 0 && settingsRes.rows[0].value?.enabled === true) {
      return true;
    }

    // 2. Otherwise, check if we have reached the threshold of reviewed PRs
    const countRes = await db.query("SELECT COUNT(*) FROM pull_requests WHERE has_review = true OR status = 'reviewed'");
    const count = parseInt(countRes.rows[0].count || '0');

    if (count >= REAL_DATA_THRESHOLD) {
      // Persistently record that we have permanently ended demo mode
      await db.query(
        "INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
        ['demo_mode_ended', JSON.stringify({ enabled: true })]
      );
      return true;
    }
    return false;
  } catch (err) {
    // Graceful fallback to false if db connection is failing on startup
    return false;
  }
}

export async function getDisplayData(realData, dummyData) {
  const isProd = await isProductionMode();
  if (isProd) return realData;
  
  // Real data first if any exist, otherwise dummy fills the rest (without mixing)
  return realData.length > 0 ? realData : dummyData;
}
