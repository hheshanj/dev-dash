const fs = require('fs');
const path = require('path');

// Max characters of chat content to return (to avoid overwhelming AI context)
const MAX_CHAT_CHARS = 4000;
// How many recent conversation sessions to scan
const MAX_SESSIONS = 3;

/**
 * Reads a single artifact file from a session folder.
 * Prefers the `.resolved` file (final stable artifact content).
 * Falls back to the base artifact file.
 *
 * @param {string} sessionDir - Full path to the session directory
 * @param {string} baseName - The base file name (e.g. 'implementation_plan.md')
 * @returns {string|null}
 */
function readArtifact(sessionDir, baseName) {
  const resolvedPath = path.join(sessionDir, `${baseName}.resolved`);
  const basePath = path.join(sessionDir, baseName);

  try {
    if (fs.existsSync(resolvedPath)) {
      return fs.readFileSync(resolvedPath, 'utf-8');
    }
    if (fs.existsSync(basePath)) {
      return fs.readFileSync(basePath, 'utf-8');
    }
  } catch (err) {
    // Silently skip unreadable files (may be locked by another process)
  }
  return null;
}

/**
 * Reads the metadata JSON for an artifact in a session folder.
 *
 * @param {string} sessionDir - Full path to the session directory
 * @param {string} baseName - The base file name (e.g. 'implementation_plan.md')
 * @returns {object|null}
 */
function readMetadata(sessionDir, baseName) {
  const metaPath = path.join(sessionDir, `${baseName}.metadata.json`);
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    // Skip malformed metadata
  }
  return null;
}

/**
 * Checks whether any file in the session directory references the given repo name.
 * Looks through metadata summaries and readable artifact content.
 *
 * @param {string} sessionDir - Full path to the session directory
 * @param {string} repoName - Repository folder name (e.g. 'project-dashboard')
 * @returns {boolean}
 */
function sessionMentionsRepo(sessionDir, repoName) {
  const normalizedRepo = repoName.toLowerCase();

  const entries = fs.readdirSync(sessionDir);
  for (const entry of entries) {
    if (entry.endsWith('.metadata.json')) {
      const meta = readMetadata(sessionDir, entry.replace('.metadata.json', ''));
      if (meta && meta.summary && meta.summary.toLowerCase().includes(normalizedRepo)) {
        return true;
      }
    }
  }

  for (const entry of entries) {
    const isArtifact = !entry.endsWith('.metadata.json') && !entry.endsWith('.resolved') &&
      !entry.match(/\.resolved\.\d+$/) && (entry.endsWith('.md') || entry.endsWith('.txt'));
    if (isArtifact) {
      const content = readArtifact(sessionDir, entry);
      if (content && content.toLowerCase().includes(normalizedRepo)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts all readable artifact text from a session folder.
 *
 * @param {string} sessionDir - Full path to the session directory
 * @returns {string} - Concatenated artifact content
 */
function extractSessionContent(sessionDir) {
  const entries = fs.readdirSync(sessionDir);
  const parts = [];

  for (const entry of entries) {
    // Only process base artifact files (markdown), skip metadata/resolved variants
    const isArtifact =
      !entry.endsWith('.metadata.json') &&
      !entry.endsWith('.resolved') &&
      !entry.match(/\.resolved\.\d+$/) &&
      (entry.endsWith('.md') || entry.endsWith('.txt'));

    if (isArtifact) {
      const meta = readMetadata(sessionDir, entry);
      const content = readArtifact(sessionDir, entry);

      if (content) {
        const header = meta
          ? `--- [${meta.artifactType || 'ARTIFACT'}] ${entry} (${meta.updatedAt || 'unknown date'}) ---\n${meta.summary ? `Summary: ${meta.summary}\n` : ''}`
          : `--- ${entry} ---\n`;
        parts.push(header + content);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Main function: scans the Antigravity brain directory for sessions related
 * to the given repository and returns a combined text context for AI analysis.
 *
 * @param {string} repoName - The repository folder name to search for
 * @returns {string} - Combined chat log context string
 */
function getChatContext(repoName) {
  const brainPath = process.env.CHAT_HISTORY_PATH;

  if (!brainPath) {
    console.warn('[chatlog] CHAT_HISTORY_PATH is not set. Skipping chat context.');
    return '';
  }

  if (!fs.existsSync(brainPath)) {
    console.warn(`[chatlog] Brain path does not exist: ${brainPath}`);
    return '';
  }

  let sessions;
  try {
    sessions = fs.readdirSync(brainPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'tempmediaStorage')
      .map(e => ({
        name: e.name,
        fullPath: path.join(brainPath, e.name),
      }));
  } catch (err) {
    console.error('[chatlog] Failed to read brain directory:', err.message);
    return '';
  }

  // Sort sessions by most recently modified (use mtime of the folder itself)
  sessions.sort((a, b) => {
    try {
      return fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs;
    } catch {
      return 0;
    }
  });

  const matchedSessions = [];

  for (const session of sessions) {
    if (matchedSessions.length >= MAX_SESSIONS) break;

    try {
      if (sessionMentionsRepo(session.fullPath, repoName)) {
        const content = extractSessionContent(session.fullPath);
        if (content.trim()) {
          matchedSessions.push(`=== Session: ${session.name} ===\n${content}`);
        }
      }
    } catch (err) {
      // Skip unreadable sessions silently
    }
  }

  if (matchedSessions.length === 0) {
    return `No Antigravity chat sessions found for repository: ${repoName}`;
  }

  const combined = matchedSessions.join('\n\n');

  // Hard limit to prevent token overflow
  if (combined.length > MAX_CHAT_CHARS) {
    return combined.substring(0, MAX_CHAT_CHARS) + '\n\n... (chat log truncated to fit context window)';
  }

  return combined;
}

module.exports = { getChatContext };
