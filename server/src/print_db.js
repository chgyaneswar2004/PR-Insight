import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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
    const users = await pool.query('SELECT id, username, display_name, email, setup_complete, role FROM users');
    console.log('--- USERS ---');
    console.table(users.rows);

    const repos = await pool.query('SELECT id, name, full_name, user_id FROM repositories');
    console.log('--- REPOSITORIES ---');
    console.table(repos.rows);

    const creds = await pool.query('SELECT user_id, length(encrypted_data) as len FROM user_credentials');
    console.log('--- USER CREDENTIALS ---');
    console.table(creds.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
