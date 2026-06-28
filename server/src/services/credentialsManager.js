import * as db from '../db/client.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * Save a single credential key-value pair for a user
 * @param {string} userId - User's UUID
 * @param {string} key - Credential key
 * @param {string} value - Credential value
 */
export async function saveUserCredential(userId, key, value) {
  const existing = await getUserCredentials(userId);
  existing[key] = value;
  const encrypted = encrypt(JSON.stringify(existing));
  
  await db.query(`
    INSERT INTO user_credentials (user_id, encrypted_data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      encrypted_data = EXCLUDED.encrypted_data,
      updated_at = NOW()
  `, [userId, encrypted]);
}

/**
 * Save multiple credentials at once
 * @param {string} userId - User's UUID
 * @param {object} credentials - Key-value credentials object
 */
export async function saveUserCredentials(userId, credentials) {
  const existing = await getUserCredentials(userId);
  const merged = { ...existing, ...credentials };
  const encrypted = encrypt(JSON.stringify(merged));
  
  await db.query(`
    INSERT INTO user_credentials (user_id, encrypted_data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      encrypted_data = EXCLUDED.encrypted_data,
      updated_at = NOW()
  `, [userId, encrypted]);
}

/**
 * Get all decrypted credentials for a user
 * @param {string} userId - User's UUID
 * @returns {Promise<Record<string, string>>}
 */
export async function getUserCredentials(userId) {
  const row = await db.query(
    'SELECT encrypted_data FROM user_credentials WHERE user_id = $1',
    [userId]
  );
  if (!row.rows[0]) return {};
  try {
    return JSON.parse(decrypt(row.rows[0].encrypted_data));
  } catch (err) {
    console.error('Decryption failed for user credentials:', userId, err);
    return {};
  }
}

/**
 * Get a single decrypted credential value
 * @param {string} userId - User's UUID
 * @param {string} key - Credential key
 * @returns {Promise<string|null>}
 */
export async function getUserCredential(userId, key) {
  const all = await getUserCredentials(userId);
  return all[key] ?? null;
}

/**
 * Mark a user's setup wizard as complete
 * @param {string} userId - User's UUID
 */
export async function markUserSetupComplete(userId) {
  await db.query(
    'UPDATE users SET setup_complete = TRUE WHERE id = $1',
    [userId]
  );
}
