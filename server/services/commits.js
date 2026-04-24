const simpleGit = require('simple-git');

const MAX_COMMITS = 100;
const MAX_DIFF_BYTES = 60_000;

/**
 * Returns a list of commits with per-commit file stats.
 * @param {string} repoPath
 * @param {object} opts
 * @param {number} opts.limit
 * @param {string} [opts.branch]
 * @returns {Promise<Array>}
 */
async function getCommitLog(repoPath, { limit = 50, branch = 'HEAD' } = {}) {
  const git = simpleGit(repoPath);

  try {
    const raw = await git.raw([
      'log', branch,
      `--max-count=${Math.min(limit, MAX_COMMITS)}`,
      '--format=COMMIT:%H|%aI|%s|%an|%ae|%P',
      '--shortstat'
    ]);

    if (!raw) return [];

    const commits = [];
    const sections = raw.split(/^COMMIT:/m).filter(Boolean);

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const meta = lines[0].split('|');
      if (meta.length < 5) continue;

      const [hash, date, message, author, email, parents] = meta;

      let linesAdded = 0;
      let linesDeleted = 0;
      let filesChanged = 0;

      const statLine = lines.find(l => l.includes('changed'));
      if (statLine) {
        const fm = statLine.match(/(\d+) file/);
        const im = statLine.match(/(\d+) insertion/);
        const dm = statLine.match(/(\d+) deletion/);
        if (fm) filesChanged = parseInt(fm[1], 10);
        if (im) linesAdded = parseInt(im[1], 10);
        if (dm) linesDeleted = parseInt(dm[1], 10);
      }

      commits.push({
        hash: hash.trim(),
        shortHash: hash.trim().substring(0, 7),
        date: date.trim(),
        message: message.trim(),
        author: author.trim(),
        email: email.trim(),
        parents: parents.trim().split(' ').filter(Boolean),
        isMerge: parents.trim().split(' ').filter(Boolean).length > 1,
        linesAdded,
        linesDeleted,
        filesChanged
      });
    }

    return commits;
  } catch (err) {
    console.error('[commits] getCommitLog error:', err.message);
    return [];
  }
}

/**
 * Returns the diff of a single commit.
 * @param {string} repoPath
 * @param {string} hash
 * @returns {Promise<{files: Array, rawDiff: string}>}
 */
async function getCommitDiff(repoPath, hash) {
  const git = simpleGit(repoPath);

  try {
    // Get the list of changed files with their status (A/M/D/R)
    const nameStatus = await git.raw([
      'diff-tree', '--no-commit-id', '-r', '--name-status', hash
    ]);

    const files = [];
    for (const line of nameStatus.trim().split('\n').filter(Boolean)) {
      const parts = line.split('\t');
      const status = parts[0]?.trim();
      const filePath = parts[1]?.trim();
      const newPath = parts[2]?.trim(); // for renames
      if (!filePath) continue;

      const statusMap = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed' };
      files.push({
        status: statusMap[status?.[0]] || 'modified',
        path: filePath,
        newPath: newPath || null
      });
    }

    // Get the actual unified diff, capped at MAX_DIFF_BYTES
    let rawDiff = await git.raw([
      'show', '--format=', '--unified=3', hash
    ]);

    if (rawDiff.length > MAX_DIFF_BYTES) {
      rawDiff = rawDiff.substring(0, MAX_DIFF_BYTES) + '\n\n... (diff truncated)';
    }

    // Parse rawDiff into per-file hunks
    const parsedFiles = parseUnifiedDiff(rawDiff, files);

    return { files: parsedFiles, rawDiff };
  } catch (err) {
    console.error(`[commits] getCommitDiff error for ${hash}:`, err.message);
    return { files: [], rawDiff: '' };
  }
}

/**
 * Parse a unified diff string into per-file sections.
 * @param {string} diff
 * @param {Array} filesMeta - from name-status
 */
function parseUnifiedDiff(diff, filesMeta) {
  const fileSections = diff.split(/^diff --git /m).filter(Boolean);
  const result = [];

  for (const section of fileSections) {
    const lines = section.split('\n');
    const headerLine = lines[0]; // e.g. "a/src/foo.js b/src/foo.js"
    const pathMatch = headerLine.match(/b\/(.+)$/);
    const filePath = pathMatch ? pathMatch[1].trim() : 'unknown';

    const meta = filesMeta.find(f => f.path === filePath || f.newPath === filePath) || {};

    const hunks = [];
    let currentHunk = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('@@')) {
        const rangeMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          header: line,
          oldStart: rangeMatch ? parseInt(rangeMatch[1], 10) : 0,
          newStart: rangeMatch ? parseInt(rangeMatch[2], 10) : 0,
          context: rangeMatch ? rangeMatch[3].trim() : '',
          lines: []
        };
      } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'ctx';
        currentHunk.lines.push({ type, content: line.substring(1) });
      }
    }
    if (currentHunk) hunks.push(currentHunk);

    if (hunks.length > 0) {
      result.push({
        path: filePath,
        status: meta.status || 'modified',
        newPath: meta.newPath || null,
        hunks
      });
    }
  }

  return result;
}

/**
 * Returns branch list and current branch.
 * @param {string} repoPath
 */
async function getBranches(repoPath) {
  const git = simpleGit(repoPath);

  try {
    const summary = await git.branch(['-a', '--sort=-committerdate']);
    return {
      current: summary.current,
      branches: summary.all
        .filter(b => !b.includes('HEAD'))
        .slice(0, 50)
        .map(b => ({
          name: b.replace(/^remotes\//, ''),
          isRemote: b.startsWith('remotes/'),
          isCurrent: b === summary.current
        }))
    };
  } catch (err) {
    console.error('[commits] getBranches error:', err.message);
    return { current: 'main', branches: [] };
  }
}

module.exports = { getCommitLog, getCommitDiff, getBranches };
