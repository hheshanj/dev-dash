const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

const MAX_FILE_SIZE = 50_000;
const MAX_KEY_FILES = 8;
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

function getIgnoreFilter(repoPath) {
  const ig = ignore();
  const gitignorePath = path.join(repoPath, '.gitignore');
  
  try {
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      ig.add(content);
    }
  } catch (err) {
    console.error('Error reading .gitignore:', err.message);
  }
  
  return ig;
}

function getFileTree(dirPath, basePath, ig, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;
  
  const items = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.name === '.git') continue;
      if (ig.ignores(relativePath)) continue;
      
      if (entry.isDirectory()) {
        const children = getFileTree(fullPath, basePath, ig, maxDepth, currentDepth + 1);
        if (children && children.length > 0) {
          items.push({ type: 'directory', name: entry.name, path: relativePath, children });
        }
      } else {
        items.push({ type: 'file', name: entry.name, path: relativePath });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }
  
  return items;
}

function findKeyFiles(dirPath, ig) {
  const found = [];
  const visited = new Set();
  
  function search(currentDir, targetNames, depth = 0) {
    if (depth > 3) return;
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name === '.git') continue;
        
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dirPath, fullPath);
        
        if (visited.has(fullPath)) continue;
        visited.add(fullPath);
        
        if (ig.ignores(relativePath)) continue;
        
        if (targetNames.includes(entry.name)) {
          found.push({ name: entry.name, path: relativePath, fullPath });
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
  const ig = getIgnoreFilter(repoPath);
  const fileTree = getFileTree(repoPath, repoPath, ig);
  const keyFiles = findKeyFiles(repoPath, ig).slice(0, MAX_KEY_FILES);
  
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
