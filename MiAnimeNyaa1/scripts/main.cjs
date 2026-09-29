const { app, BrowserWindow, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');

let mainWindow;
let serverProcess;
let tray;

function startBackend() {
  const userDataPath = app.getPath('userData');

  if (app.isPackaged) {
    // EN PRODUCCIÓN: server.js está en resourcesPath/server/
    const serverPath = path.join(process.resourcesPath, 'server', 'server.js');
    console.log('[Backend] Iniciando desde:', serverPath);
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, TABERNA_DATA_PATH: userDataPath },
      silent: true
    });
  } else {
    // EN DESARROLLO: server.js está en la raíz/server/
    // __dirname = scripts/, subimos un nivel para llegar a la raíz
    const serverPath = path.join(__dirname, '..', 'server', 'server.js');
    console.log('[Backend] Iniciando desde:', serverPath);
    serverProcess = spawn('node', ['--watch', serverPath], {
      env: { ...process.env, TABERNA_DATA_PATH: userDataPath }
    });
  }

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Backend Err]: ${data}`));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "La Taberna Anime",
    autoHideMenuBar: true,
    backgroundColor: '#08020f',
    icon: path.join(__dirname, '..', 'public', 'icon.ico'), // ← Subimos un nivel
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  const indexPath = app.isPackaged
    ? `file://${path.join(process.resourcesPath, 'dist', 'index.html')}`
    : 'http://localhost:5173';

  console.log("[Electron]: Intentando cargar la interfaz desde:", indexPath);
  
  mainWindow.loadURL(indexPath);

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.ico');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar La Taberna', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Cerrar Servidor y Salir', click: () => {
        app.isQuiting = true;
        app.quit();
    }}
  ]);

  tray.setToolTip('La Taberna 🍇');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*']
      }
    });
  });

  startBackend();
  createTray();
  
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});