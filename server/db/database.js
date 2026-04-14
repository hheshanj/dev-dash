const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'devdash.db');
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

/**
 * Inserts or updates a project by its path.
 */
function upsertProject(name, repoPath) {
  const stmt = db.prepare(`
    INSERT INTO projects (name, path)
    VALUES (?, ?)
    ON CONFLICT(path) DO UPDATE SET name = excluded.name
  `);
  const result = stmt.run(name, repoPath);
  return result.lastInsertRowid;
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
  const stmt = db.prepare(`SELECT * FROM projects ORDER BY last_analyzed DESC`);
  return stmt.all();
}

/**
 * Fetches a project by ID.
 */
function getProjectById(id) {
  const stmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
  return stmt.get(id);
}

module.exports = {
  db,
  upsertProject,
  saveAnalysis,
  getLatestAnalysis,
  getAllProjects,
  getProjectById
};
