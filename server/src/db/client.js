import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read connection parameters from environment with fallback values
export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '6432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'Akhil@7847',
  database: process.env.PGDATABASE || 'postgres',
  connectionTimeoutMillis: 5000,
});

export async function query(text, params) {
  return pool.query(text, params);
}

// Self-initialize schema if not exists
export async function initDb() {
  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'repositories'
      );
    `;
    const res = await pool.query(checkQuery);
    const exists = res.rows[0].exists;

    if (!exists) {
      console.log('⏳ Database tables not found. Initializing schema...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✓ Database schema initialized successfully.');
    } else {
      console.log('✓ Database tables verified.');
    }
  } catch (err) {
    console.error('❌ Database connection or initialization failed. Running in fallback mode:', err.message);
  }
}

// Run init
initDb();
