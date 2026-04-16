const express = require('express');
const router = express.Router();
const { getSetting, setSetting, getAllSettings } = require('../db/database');
const fs = require('fs');

router.get('/', (req, res) => {
  // Read all from DB
  const settings = getAllSettings();
  
  // We fall back to process.env if it's not in DB yet (for initial transition)
  const reposPath = settings['REPOS_PATH'] || process.env.REPOS_PATH || '';
  const nvidiaKey = settings['NVIDIA_API_KEY'] || process.env.NVIDIA_API_KEY || '';
  const githubToken = settings['GITHUB_TOKEN'] || process.env.GITHUB_TOKEN || '';
  
  // We mask the tokens so they aren't exposed in plaintext unnecessarily
  const maskToken = (token) => {
    if (!token) return '';
    if (token.length < 8) return '*'.repeat(token.length);
    return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4);
  };
  
  res.json({
    isSetup: !!reposPath && !!nvidiaKey,
    settings: {
      REPOS_PATH: reposPath,
      NVIDIA_API_KEY: maskToken(nvidiaKey),
      GITHUB_TOKEN: maskToken(githubToken)
    }
  });
});

router.post('/', (req, res) => {
  const { REPOS_PATH, NVIDIA_API_KEY, GITHUB_TOKEN } = req.body;
  
  if (REPOS_PATH) {
    if (!fs.existsSync(REPOS_PATH)) {
      return res.status(400).json({ error: 'The provided workspace path does not exist on disk.' });
    }
    setSetting('REPOS_PATH', REPOS_PATH);
    process.env.REPOS_PATH = REPOS_PATH;
  }
  
  // Only update API keys if they are not masked (meaning the user provided a new one)
  if (NVIDIA_API_KEY && !NVIDIA_API_KEY.includes('***')) {
    setSetting('NVIDIA_API_KEY', NVIDIA_API_KEY);
    process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
  }
  
  if (GITHUB_TOKEN && !GITHUB_TOKEN.includes('***')) {
    setSetting('GITHUB_TOKEN', GITHUB_TOKEN);
    process.env.GITHUB_TOKEN = GITHUB_TOKEN;
  } else if (req.body.hasOwnProperty('GITHUB_TOKEN') && GITHUB_TOKEN === '') {
    // Allows clearing the token explicitly
    setSetting('GITHUB_TOKEN', '');
    process.env.GITHUB_TOKEN = '';
  }
  
  res.json({ success: true, message: 'Settings saved successfully' });
});

module.exports = router;
