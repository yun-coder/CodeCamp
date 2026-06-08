const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
  ipcMain,
} = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
const http = require('http');

// ── Constants ──────────────────────────────────────────────
const isDev = !app.isPackaged;

// ── Paths ──────────────────────────────────────────────────
function getBackendInfo() {
  if (isDev) {
    const backendDir = path.join(__dirname, '..', 'backend');
    return {
      cmd: 'python',
      args: ['run_backend.py'],
      cwd: backendDir,
      envExt: {},
    };
  }
  const resourcePath = path.join(process.resourcesPath, 'backend');
  return {
    cmd: path.join(resourcePath, 'backend.exe'),
    args: [],
    cwd: resourcePath,
    envExt: {
      PROJECT_HELPER_DATA_DIR: getUserDataDir(),
      PROJECT_HELPER_STATIC_DIR: path.join(process.resourcesPath, 'frontend'),
    },
  };
}

function getUserDataDir() {
  const dir = path.join(app.getPath('userData'), 'runtime-data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTrayIconPath() {
  const p = path.join(__dirname, 'resources', 'tray-icon.png');
  return fs.existsSync(p) ? p : path.join(__dirname, 'resources', 'icon.png');
}

// ── Port management ────────────────────────────────────────
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// ── Backend process ────────────────────────────────────────
let backendProcess = null;
let backendPort = null;

async function startBackend() {
  backendPort = await findFreePort();
  const info = getBackendInfo();
  const args = [...info.args, '--port', String(backendPort)];

  console.log(`[main] Starting backend on port ${backendPort}`);

  backendProcess = spawn(info.cmd, args, {
    cwd: info.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...info.envExt, PYTHONUNBUFFERED: '1' },
    windowsHide: true,
  });

  backendProcess.stdout.on('data', (d) => console.log(`[backend] ${d.toString().trim()}`));
  backendProcess.stderr.on('data', (d) => console.log(`[backend] ${d.toString().trim()}`));
  backendProcess.on('exit', (code) => {
    console.log(`[main] Backend exited (code ${code})`);
    backendProcess = null;
  });

  await waitForBackend(60);
  return backendPort;
}

function waitForBackend(maxRetries) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      http.get(`http://127.0.0.1:${backendPort}/api/health`, (res) => {
        if (res.statusCode === 200) { clearInterval(iv); resolve(); }
      }).on('error', () => {});
      if (attempts >= maxRetries) {
        clearInterval(iv);
        reject(new Error('Backend did not start within timeout'));
      }
    }, 1000);
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    setTimeout(() => { if (backendProcess) backendProcess.kill('SIGKILL'); }, 5000);
  }
}

// ── Window ─────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: 'Project Helper',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#08060f',
  });

  mainWindow.loadURL(`http://127.0.0.1:${backendPort}/`);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Tray ───────────────────────────────────────────────────
function createTray() {
  const iconPath = getTrayIconPath();
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip('Project Helper');

  const menu = Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => {
      if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }},
    { type: 'separator' },
    { label: '开机自启', type: 'checkbox', checked: isAutoLaunchEnabled(),
      click: (mi) => toggleAutoLaunch(mi.checked) },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; stopBackend(); app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

// ── Auto-start ─────────────────────────────────────────────
const RK = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const RV = 'ProjectHelper';

function isAutoLaunchEnabled() {
  try { execSync(`reg query "${RK}" /v "${RV}"`, { encoding:'utf-8', timeout:5000, windowsHide:true }); return true; }
  catch { return false; }
}
function toggleAutoLaunch(on) {
  try {
    const ep = process.execPath.replace(/\\/g, '\\\\');
    if (on) execSync(`reg add "${RK}" /v "${RV}" /t REG_SZ /d "\\"${ep}\\"" /f`, { timeout:5000, windowsHide:true });
    else   execSync(`reg delete "${RK}" /v "${RV}" /f`, { timeout:5000, windowsHide:true });
  } catch(e) { console.error('[main] reg error:', e.message); }
}

// ── IPC ────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-auto-launch-enabled', () => isAutoLaunchEnabled());
ipcMain.handle('toggle-auto-launch', (_e, on) => toggleAutoLaunch(on));

// ── Lifecycle ──────────────────────────────────────────────
app.isQuitting = false;

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
    createTray();
    console.log(`[main] Ready on port ${backendPort}`);
  } catch (err) {
    dialog.showErrorBox('启动失败', `后端服务启动失败：${err.message}\n\n请确认已安装 Python 及依赖。`);
    app.quit();
  }
});

app.on('before-quit', () => { app.isQuitting = true; stopBackend(); });
app.on('activate', () => { if (mainWindow) mainWindow.show(); });

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}
