const express = require('express');
const fs = require('fs');
const router = express.Router();
const { scanRepos } = require('../services/scanRepos');
const { getRepoInfo } = require('../services/git');
const { getChatContext } = require('../services/chatlog');
const { analyzeProject } = require('../services/nvidia');
const {
  upsertProject,
  saveAnalysis,
  getLatestAnalysis,
  getAllProjects,
  getProjectById
} = require('../db/database');

let scanCache = null;
let scanCacheTime = 0;
const SCAN_TTL_MS = 30_000;

const analyzeCooldowns = new Map();
const COOLDOWN_MS = 60_000;

/**
 * GET /api/projects
 * Scans the filesystem, updates the database, and returns all projects.
 */
router.get('/', (req, res) => {
  try {
    const now = Date.now();
    if (!scanCache || now - scanCacheTime > SCAN_TTL_MS) {
      const scannedRepos = scanRepos();
      for (const repo of scannedRepos) {
        try {
          upsertProject(repo.name, repo.path);
        } catch (dbErr) {
          console.error(`[projects] Failed to upsert "${repo.name}":`, dbErr.message);
        }
      }
      scanCache = true;
      scanCacheTime = now;
    }
    
    const projects = getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:id
 * Returns a specific project and its latest analysis.
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const project = getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const analysis = getLatestAnalysis(id);
    res.json({ ...project, analysis });
  } catch (error) {
    console.error(`Error in GET /api/projects/${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

/**
 * POST /api/projects/:id/analyze
 * Triggers a fresh AI analysis for the project.
 */
router.post('/:id/analyze', async (req, res) => {
  const { id } = req.params;
  const lastRun = analyzeCooldowns.get(id) || 0;
  if (Date.now() - lastRun < COOLDOWN_MS) {
    return res.status(429).json({ error: 'Analysis was run recently. Please wait before re-analyzing.' });
  }
  analyzeCooldowns.set(id, Date.now());

  try {
    const project = getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!fs.existsSync(project.path)) {
      return res.status(422).json({ error: `Repository path no longer exists: ${project.path}` });
    }
    
    const gitContext = await getRepoInfo(project.path);
    const chatContext = getChatContext(project.name);
    
    const analysisResult = await analyzeProject(project.name, gitContext, chatContext);
    
    saveAnalysis(id, analysisResult);
    
    res.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error(`Error in POST /api/projects/${id}/analyze:`, error.message);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Analysis failed' });
  }
});

module.exports = router;
