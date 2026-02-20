import Database from 'better-sqlite3';

const db = new Database('mesoflix.db');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    capital_user_id TEXT,
    name TEXT,
    email TEXT UNIQUE,
    encrypted_tokens TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
