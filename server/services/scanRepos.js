const fs = require('fs');
const path = require('path');

/**
 * Scans the REPOS_PATH directory for folders containing a .git directory.
 * @returns {Array<{name: string, path: string}>} Array of repository objects
 */
function scanRepos() {
  const reposPath = process.env.REPOS_PATH;
  
  if (!reposPath) {
    console.warn('REPOS_PATH environment variable is not set');
    return [];
  }

  if (!fs.existsSync(reposPath)) {
    console.warn(`REPOS_PATH does not exist: ${reposPath}`);
    return [];
  }

  const entries = fs.readdirSync(reposPath, { withFileTypes: true });
  const repos = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(reposPath, entry.name);
      const gitDir = path.join(fullPath, '.git');
      
      if (fs.existsSync(gitDir)) {
        repos.push({
          name: entry.name,
          path: fullPath
        });
      }
    }
  }

  return repos;
}

module.exports = { scanRepos };
