const { app, BrowserWindow } = require('electron');
const path = require('path');

// Determine if we are in development mode
const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

// Force production mode if packaged to ensure server serves static files
if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

// Handle setting DB_DIR for server before requiring it or starting it
process.env.DB_DIR = path.join(app.getPath('userData'), 'database');

// Starting the Express server
const PORT = 3001; 
require('./server/index.js'); 

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'DevDash',
    backgroundColor: '#0f1117'
  });

  // For development, load from Vite dev server
  // For production, load from the internal express server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
