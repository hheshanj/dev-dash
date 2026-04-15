const express = require('express');
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

/**
 * GET /api/projects
 * Scans the filesystem, updates the database, and returns all projects.
 */
router.get('/', (req, res) => {
  try {
    const scannedRepos = scanRepos();
    scannedRepos.forEach(repo => {
      upsertProject(repo.name, repo.path);
    });
    
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
  try {
    const project = getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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
