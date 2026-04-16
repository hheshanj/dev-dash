const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 50_000;
const KEY_FILES = [
  'README.md', 'README.txt', 'README',
  'package.json', 'pyproject.toml', 'setup.py', 'requirements.txt', 'Cargo.toml',
  'index.js', 'main.js', 'app.js', 'server.js',
  'main.ts', 'index.ts', 'app.ts',
  'main.py', 'app.py', 'server.py',
  'main.go', 'index.go', 'main.rs',
  'src/index.js', 'src/main.js', 'src/index.ts', 'src/main.ts',
  'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx'
];

function parseGitignore(repoPath) {
  const patterns = [];
  const gitignorePath = path.join(repoPath, '.gitignore');
  
  try {
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.push(trimmed);
        }
      }
    }
  } catch (err) {
    console.error('Error reading .gitignore:', err.message);
  }
  
  return patterns;
}

function matchesIgnore(filePath, basePath, patterns) {
  const relativePath = path.relative(basePath, filePath);
  const normalized = relativePath.replace(/\\/g, '/');
  
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;
    
    if (pattern.includes('/')) {
      if (normalized.startsWith(pattern.replace(/\/$/, ''))) return true;
    } else {
      const fileName = path.basename(normalized);
      if (fileName === pattern || fileName.match(new RegExp('^' + pattern.replace(/\*/g, '.*') + '$'))) return true;
    }
  }
  return false;
}

function getFileTree(dirPath, basePath, patterns, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;
  
  const items = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.name === '.git') continue;
      if (matchesIgnore(fullPath, basePath, patterns)) continue;
      
      if (entry.isDirectory()) {
        const children = getFileTree(fullPath, basePath, patterns, maxDepth, currentDepth + 1);
        if (children && children.length > 0) {
          items.push({ type: 'directory', name: entry.name, path: path.relative(basePath, fullPath), children });
        }
      } else {
        items.push({ type: 'file', name: entry.name, path: path.relative(basePath, fullPath) });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }
  
  return items;
}

function findKeyFiles(dirPath) {
  const found = [];
  const visited = new Set();
  
  function search(currentDir, targetNames, depth = 0) {
    if (depth > 3) return;
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name === '.git') continue;
        
        const fullPath = path.join(currentDir, entry.name);
        
        if (visited.has(fullPath)) continue;
        visited.add(fullPath);
        
        if (targetNames.includes(entry.name)) {
          found.push({ name: entry.name, path: path.relative(dirPath, fullPath), fullPath });
        }
        
        if (entry.isDirectory()) {
          search(fullPath, targetNames, depth + 1);
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }
  
  search(dirPath, KEY_FILES);
  return found;
}

function readFileContent(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return `[File too large: ${stats.size} bytes, truncated]`;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return `[Error reading file: ${err.message}]`;
  }
}

async function getFileContext(repoPath) {
  const patterns = parseGitignore(repoPath);
  const fileTree = getFileTree(repoPath, repoPath, patterns);
  const keyFiles = findKeyFiles(repoPath);
  
  const keyFileContents = [];
  for (const file of keyFiles) {
    const content = readFileContent(file.fullPath);
    keyFileContents.push({
      name: file.name,
      path: file.path,
      content: content.substring(0, MAX_FILE_SIZE)
    });
  }
  
  return {
    tree: fileTree,
    keyFiles: keyFileContents
  };
}

module.exports = { getFileContext };
