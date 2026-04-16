const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// In Electron production, we pass a specific DB_DIR in main.js
const dbDir = process.env.DB_DIR || __dirname;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'devdash.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    last_analyzed DATETIME
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    analysis_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

// Simple schema migrations
try { db.exec("ALTER TABLE projects ADD COLUMN pinned BOOLEAN DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE projects ADD COLUMN notes TEXT DEFAULT '';"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

/**
 * Settings Management
 */
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  stmt.run(key, value);
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

/**
 * Inserts or updates a project by its path.
 */
function upsertProject(name, repoPath) {
  const stmt = db.prepare(`
    INSERT INTO projects (name, path)
    VALUES (?, ?)
    ON CONFLICT(path) DO UPDATE SET name = excluded.name
  `);
  stmt.run(name, repoPath);

  const row = db.prepare(`SELECT id FROM projects WHERE path = ?`).get(repoPath);
  return row.id;
}

/**
 * Saves a new AI analysis for a project.
 */
function saveAnalysis(projectId, analysisJson) {
  const stmt = db.prepare(`
    INSERT INTO analyses (project_id, analysis_json)
    VALUES (?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE projects SET last_analyzed = CURRENT_TIMESTAMP WHERE id = ?
  `);
  
  const transaction = db.transaction((pId, json) => {
    stmt.run(pId, json);
    updateStmt.run(pId);
  });
  
  return transaction(projectId, JSON.stringify(analysisJson));
}

/**
 * Fetches the most recent analysis for a given project.
 */
function getLatestAnalysis(projectId) {
  const stmt = db.prepare(`
    SELECT * FROM analyses 
    WHERE project_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  const row = stmt.get(projectId);
  return row ? { ...row, analysis_json: JSON.parse(row.analysis_json) } : null;
}

/**
 * Returns all projects in the database.
 */
function getAllProjects() {
  const stmt = db.prepare(`
    SELECT p.*, a.analysis_json
    FROM projects p
    LEFT JOIN (
      SELECT project_id, analysis_json,
             ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
      FROM analyses
    ) a ON a.project_id = p.id AND a.rn = 1
    ORDER BY p.pinned DESC, p.last_analyzed DESC
  `);
  return stmt.all().map(row => ({
    ...row,
    analysis: row.analysis_json ? { analysis_json: JSON.parse(row.analysis_json) } : null,
    analysis_json: undefined
  }));
}

/**
 * Fetches a project by ID.
 */
function getProjectById(id) {
  const stmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
  return stmt.get(id);
}

function updateProjectPin(id, pinned) {
  const stmt = db.prepare('UPDATE projects SET pinned = ? WHERE id = ?');
  stmt.run(pinned ? 1 : 0, id);
}

function updateProjectNotes(id, notes) {
  const stmt = db.prepare('UPDATE projects SET notes = ? WHERE id = ?');
  stmt.run(notes, id);
}

module.exports = {
  db,
  upsertProject,
  saveAnalysis,
  getLatestAnalysis,
  getAllProjects,
  getProjectById,
  updateProjectPin,
  updateProjectNotes,
  getSetting,
  setSetting,
  getAllSettings
};
