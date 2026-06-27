import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function main() {
  try {
    const notifications = await pool.query("SELECT id, type, title, message, created_at FROM notifications ORDER BY created_at DESC LIMIT 5");
    console.log('--- RECENT NOTIFICATIONS ---');
    console.table(notifications.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
