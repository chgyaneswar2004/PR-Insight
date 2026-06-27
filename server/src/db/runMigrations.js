import { pool } from './client.js';

async function runMigrations() {
  console.log('⏳ Running database migrations...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        github_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'member',
        setup_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
    `);
    console.log('✓ Created users table');

    // 2. Create user_credentials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        encrypted_data TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);
    console.log('✓ Created user_credentials table');

    // 3. Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Created sessions table');

    // 4. Alter existing tables to add user_id column
    await client.query('ALTER TABLE repositories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    await client.query('ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    await client.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    await client.query('ALTER TABLE developers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);');
    console.log('✓ Altered data tables to add user_id');

    // 5. Add indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_repositories_user ON repositories(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pull_requests_user ON pull_requests(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);');
    console.log('✓ Added indexes on user_id');

    // 6. Update developers unique constraint
    try {
      await client.query('ALTER TABLE developers DROP CONSTRAINT IF EXISTS developers_username_key;');
      await client.query('ALTER TABLE developers ADD CONSTRAINT developers_username_user_id_key UNIQUE (username, user_id);');
      console.log('✓ Updated developers unique constraint');
    } catch (constErr) {
      console.warn('⚠️ Non-critical: developers unique constraint alter failed:', constErr.message);
    }

    await client.query('COMMIT');
    console.log('🎉 Migrations completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

runMigrations().catch(() => process.exit(1));
