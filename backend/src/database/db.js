const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './school.db');

let _db = null;

async function getDb() {
  if (_db) return _db;
  _db = await open({ filename: dbPath, driver: sqlite3.Database });
  await _db.run('PRAGMA journal_mode = WAL');
  await _db.run('PRAGMA foreign_keys = ON');
  return _db;
}

module.exports = { getDb };
