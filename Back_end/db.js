const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'gestion_recours',
  user: process.env.DB_USER || 'recours_user',
  password: process.env.DB_PASSWORD || 'recours_password',
};

const sslEnabled = process.env.DB_SSL === 'true';
const pool = new Pool({
  ...dbConfig,
  ssl: sslEnabled
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
});

const migrationsDir = path.join(__dirname, 'migrations');

async function query(text, params = []) {
  return pool.query(text, params);
}

async function isAvailable() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

async function runMigrations() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationFiles = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
      : [];

    for (const file of migrationFiles) {
      const existing = await client.query(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [file]
      );

      if (existing.rows.length > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
    }

    await client.query('COMMIT');
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }

    if (err.code === '28P01') {
      err.message = `Authentification PostgreSQL refusee pour l'utilisateur "${dbConfig.user}". Verifiez DB_USER et DB_PASSWORD dans Back_end/.env.`;
    } else if (err.code === '3D000') {
      err.message = `La base PostgreSQL "${dbConfig.database}" est introuvable. Creez-la ou corrigez DB_NAME dans Back_end/.env.`;
    }

    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function close() {
  await pool.end();
}

module.exports = {
  query,
  isAvailable,
  runMigrations,
  close,
  dbConfig,
};
