const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

// Initialize DB and load settings
const { db, getAllSettings } = require('./db/database');
const settings = getAllSettings();
Object.keys(settings).forEach(key => {
  if (settings[key]) {
    process.env[key] = settings[key];
  }
});

const projectRoutes = require('./routes/projects');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  
  // Fallback to index.html for SPA routing
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
