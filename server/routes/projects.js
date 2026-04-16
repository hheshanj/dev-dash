const express = require('express');
const fs = require('fs');
const router = express.Router();
const { scanRepos } = require('../services/scanRepos');
const { getRepoInfo } = require('../services/git');
const { getChatContext } = require('../services/chatlog');
const { analyzeProject, improveProject } = require('../services/nvidia');
const { getFileContext } = require('../services/files');
const { getStats } = require('../services/stats');
const { getRepoStats, getIssues, getPullRequests } = require('../services/github');
const {
  upsertProject,
  saveAnalysis,
  getLatestAnalysis,
  getAllProjects,
  getProjectById,
  updateProjectPin,
  updateProjectNotes
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
    const fileContext = await getFileContext(project.path);
    
    // Pass githubContext to analyzeProject
    const issues = await getIssues(project.path);
    const pullRequests = await getPullRequests(project.path);
    
    const analysisResult = await analyzeProject(project.name, gitContext, chatContext, fileContext, { issues, pullRequests });
    
    saveAnalysis(id, analysisResult);
    
    res.json({ success: true, analysis: analysisResult });
  } catch (error) {
    // Reset cooldown on failure so user can retry immediately
    analyzeCooldowns.delete(id);
    console.error(`Error in POST /api/projects/${id}/analyze:`, error.message);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Analysis failed. Please try again.' });
  }
});

const improveCooldowns = new Map();

router.post('/:id/improve', async (req, res) => {
  const { id } = req.params;
  const lastRun = improveCooldowns.get(id) || 0;
  if (Date.now() - lastRun < COOLDOWN_MS) {
    return res.status(429).json({ error: 'Improvement analysis was run recently. Please wait before re-analyzing.' });
  }
  improveCooldowns.set(id, Date.now());

  try {
    const project = getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!fs.existsSync(project.path)) {
      return res.status(422).json({ error: `Repository path no longer exists: ${project.path}` });
    }
    
    const gitContext = await getRepoInfo(project.path);
    const fileContext = await getFileContext(project.path);
    
    const codeContext = {
      tree: fileContext.tree,
      keyFiles: fileContext.keyFiles,
      gitContext
    };
    
    const improvementResult = await improveProject(project.name, codeContext);
    
    res.json({ success: true, improvements: improvementResult });
  } catch (error) {
    // Reset cooldown on failure so user can retry immediately
    improveCooldowns.delete(id);
    console.error(`Error in POST /api/projects/${id}/improve:`, error.message);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Improvement analysis failed. Please try again.' });
  }
});

router.get('/:id/stats', async (req, res) => {
  const { id } = req.params;
  
  try {
    const project = getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!fs.existsSync(project.path)) {
      return res.status(422).json({ error: `Repository path no longer exists: ${project.path}` });
    }
    
    const stats = await getStats(project.path);
    const githubStats = await getRepoStats(project.path);
    const issues = await getIssues(project.path);
    const pullRequests = await getPullRequests(project.path);
    
    res.json({
      local: stats,
      github: githubStats,
      issues,
      pullRequests
    });
  } catch (error) {
    console.error(`Error in GET /api/projects/${id}/stats:`, error.message);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
});

router.patch('/:id/pin', (req, res) => {
  const { id } = req.params;
  const { pinned } = req.body;
  try {
    updateProjectPin(id, pinned);
    res.json({ success: true, pinned });
  } catch (error) {
    console.error(`Error in PATCH /api/projects/${id}/pin:`, error.message);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

router.patch('/:id/notes', (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    updateProjectNotes(id, notes);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error in PATCH /api/projects/${id}/notes:`, error.message);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

module.exports = router;
