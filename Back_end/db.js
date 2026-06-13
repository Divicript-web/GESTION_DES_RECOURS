require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const configuredPath = process.env.SQLITE_PATH || './data/recours.sqlite';
const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.join(__dirname, configuredPath);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    post_nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'etudiant',
    departement TEXT,
    promotion TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function normalizeQuery(text) {
  return text.replace(/\$(\d+)/g, '?');
}

function query(text, params = []) {
  const sql = normalizeQuery(text);
  const statement = database.prepare(sql);
  const returnsRows = /^\s*SELECT\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

  if (returnsRows) {
    const rows = statement.all(params);
    return { rows, rowCount: rows.length };
  }

  const result = statement.run(params);
  return { rows: [], rowCount: result.changes };
}

function isAvailable() {
  try {
    database.prepare('SELECT 1').get();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  query,
  isAvailable,
  databasePath,
};
