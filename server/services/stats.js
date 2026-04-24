const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const LANGUAGE_EXTENSIONS = {
  'JavaScript': ['.js', '.jsx', '.mjs', '.cjs'],
  'TypeScript': ['.ts', '.tsx'],
  'Python': ['.py'],
  'Java': ['.java'],
  'C': ['.c', '.h'],
  'C++': ['.cpp', '.hpp', '.cc', '.cxx'],
  'C#': ['.cs'],
  'Go': ['.go'],
  'Rust': ['.rs'],
  'Ruby': ['.rb'],
  'PHP': ['.php'],
  'Swift': ['.swift'],
  'Kotlin': ['.kt', '.kts'],
  'Scala': ['.scala'],
  'HTML': ['.html', '.htm'],
  'CSS': ['.css', '.scss', '.sass', '.less'],
  'JSON': ['.json'],
  'YAML': ['.yaml', '.yml'],
  'Markdown': ['.md', '.mdx'],
  'SQL': ['.sql'],
  'Shell': ['.sh', '.bash', '.zsh'],
  'Dockerfile': ['.dockerfile', 'Dockerfile'],
  'Vue': ['.vue'],
  'Svelte': ['.svelte']
};

function getLanguageFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  
  for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext) || (lang === 'Dockerfile' && baseName === 'dockerfile')) {
      return lang;
    }
  }
  return 'Other';
}

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.cache', '.vscode', '.venv', 'venv', 'out', 'target']);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'Gemfile.lock', 'Cargo.lock']);

function aggregateLanguages(repoPath) {
  const stats = {};
  
  function walk(dir, depth = 0) {
    if (depth > 5) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (IGNORE_DIRS.has(entry.name)) continue;
          walk(fullPath, depth + 1);
        } else {
          if (IGNORE_FILES.has(entry.name)) continue;
          const lang = getLanguageFromFile(entry.name);
          if (!stats[lang]) {
            stats[lang] = { files: 0, size: 0 };
          }
          try {
            const fileStats = fs.statSync(fullPath);
            stats[lang].files += 1;
            stats[lang].size += fileStats.size;
          } catch (e) {
            // Skip inaccessible files
          }
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }
  
  walk(repoPath);
  return stats;
}

async function getCommitStats(repoPath) {
  const git = simpleGit(repoPath);
  
  try {
    const rawLog = await git.raw([
      'log',
      '-100',
      '--format=COMMIT:%H|%aI|%s|%an',
      '--shortstat'
    ]);

    if (!rawLog) return [];

    const commits = [];
    const sections = rawLog.split('COMMIT:').filter(Boolean);

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const metadata = lines[0].split('|');
      
      if (metadata.length < 4) continue;

      const [hash, date, message, author] = metadata;
      let linesAdded = 0;
      let linesDeleted = 0;
      let filesChanged = 0;

      // Look for the shortstat line (e.g., " 2 files changed, 10 insertions(+), 5 deletions(-)")
      const statLine = lines.find(l => l.includes('changed'));
      if (statLine) {
        const fileMatch = statLine.match(/(\d+) file/);
        const insertMatch = statLine.match(/(\d+) insertion/);
        const deleteMatch = statLine.match(/(\d+) deletion/);

        if (fileMatch) filesChanged = parseInt(fileMatch[1], 10);
        if (insertMatch) linesAdded = parseInt(insertMatch[1], 10);
        if (deleteMatch) linesDeleted = parseInt(deleteMatch[1], 10);
      }

      commits.push({
        hash: hash.substring(0, 7),
        date: date.substring(0, 10),
        message,
        author,
        linesAdded,
        linesDeleted,
        filesChanged
      });
    }

    return commits;
  } catch (err) {
    console.error('Error getting commit log:', err.message);
    return [];
  }
}

async function getStats(repoPath) {
  const languages = aggregateLanguages(repoPath);
  const commits = await getCommitStats(repoPath);
  
  const recognizedLanguages = Object.entries(languages).filter(([name]) => name !== 'Other');
  
  const totalLanguageBytes = recognizedLanguages.reduce((sum, [, data]) => sum + data.size, 0);
  
  const languageBreakdown = recognizedLanguages.map(([name, data]) => ({
    name,
    files: data.files,
    bytes: data.size,
    percentage: totalLanguageBytes > 0 ? Math.round((data.size / totalLanguageBytes) * 100) : 0
  })).sort((a, b) => b.bytes - a.bytes);
  
  const commitsByDate = {};
  let totalAdded = 0;
  let totalDeleted = 0;
  
  for (const commit of commits) {
    const date = commit.date;
    if (!commitsByDate[date]) {
      commitsByDate[date] = { commits: 0, added: 0, deleted: 0 };
    }
    commitsByDate[date].commits += 1;
    commitsByDate[date].added += commit.linesAdded;
    commitsByDate[date].deleted += commit.linesDeleted;
    totalAdded += commit.linesAdded;
    totalDeleted += commit.linesDeleted;
  }
  
  const timeSeries = Object.entries(commitsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      commits: data.commits,
      added: data.added,
      deleted: data.deleted
    }));
  
  return {
    totalFiles: Object.values(languages).reduce((sum, l) => sum + l.files, 0),
    languageBreakdown,
    totalCommits: commits.length,
    timeSeries,
    totalAdded,
    totalDeleted
  };
}

module.exports = { getStats };
