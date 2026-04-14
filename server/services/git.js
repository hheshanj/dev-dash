const simpleGit = require('simple-git');
const path = require('path');

const MAX_COMMITS = 10;
const MAX_DIFF_LENGTH = 5000;

/**
 * Fetches Git context for a repository.
 * @param {string} repoPath - Absolute path to the repository
 * @returns {Promise<{commits: string, status: string, diff: string}>}
 */
async function getRepoInfo(repoPath) {
  const git = simpleGit(repoPath);
  
  let commits = '';
  let status = '';
  let diff = '';

  try {
    const log = await git.log({ maxCount: MAX_COMMITS });
    if (log.all && log.all.length > 0) {
      commits = log.all.map(c => 
        `${c.date.substring(0, 10)} | ${c.author_name} | ${c.message}`
      ).join('\n');
    }
  } catch (err) {
    console.error(`Error fetching commits for ${repoPath}:`, err.message);
  }

  try {
    const statusResult = await git.status();
    const modified = statusResult.modified.length;
    const staged = statusResult.staged.length;
    const deleted = statusResult.deleted.length;
    const untracked = statusResult.not_added.length;
    
    let statusLines = [];
    if (staged > 0) statusLines.push(`${staged} staged`);
    if (modified > 0) statusLines.push(`${modified} modified`);
    if (deleted > 0) statusLines.push(`${deleted} deleted`);
    if (untracked > 0) statusLines.push(`${untracked} untracked`);
    
    status = statusLines.length > 0 
      ? statusLines.join(', ') 
      : 'clean';
  } catch (err) {
    console.error(`Error fetching status for ${repoPath}:`, err.message);
    status = 'error';
  }

  try {
    const diffResult = await git.diff();
    if (diffResult && diffResult.length > 0) {
      diff = diffResult.length > MAX_DIFF_LENGTH
        ? diffResult.substring(0, MAX_DIFF_LENGTH) + '\n... (truncated)'
        : diffResult;
    } else {
      diff = 'No uncommitted changes';
    }
  } catch (err) {
    console.error(`Error fetching diff for ${repoPath}:`, err.message);
    diff = 'error';
  }

  return { commits, status, diff };
}

module.exports = { getRepoInfo };
