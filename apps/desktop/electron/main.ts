import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

const APP_SCHEME = 'renderical';
const DEEP_LINK_CHANNEL = 'deep-link';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
// Holds a deep link received before the window/renderer is ready to receive it.
let pendingDeepLink: string | null = null;

// Register this app as the handler for `renderical://` links so the OS routes
// auth callbacks (verify email, reset password, OAuth) back to us.
if (process.defaultApp && process.argv.length >= 2) {
  // In dev the app is launched via electron + a script path; pass them along.
  app.setAsDefaultProtocolClient(APP_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(APP_SCHEME);
}

function deliverDeepLink(url: string) {
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send(DEEP_LINK_CHANNEL, url);
  } else {
    // Stash until the renderer has finished loading.
    pendingDeepLink = url;
  }
}

/** Pick the first `renderical://…` argument out of an argv list (Windows/Linux). */
function findDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${APP_SCHEME}://`)) ?? null;
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Flush any deep link that arrived before the renderer was ready.
  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingDeepLink) {
      mainWindow?.webContents.send(DEEP_LINK_CHANNEL, pendingDeepLink);
      pendingDeepLink = null;
    }
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Only allow a single instance so deep links reach the running window
// (Windows/Linux deliver the URL as argv to a second launch).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const url = findDeepLink(argv);
    if (url) deliverDeepLink(url);
  });

  // macOS delivers deep links through this event.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    deliverDeepLink(url);
  });

  // This method will be called when Electron has finished initialization.
  app.on('ready', () => {
    createWindow();
    // Cold-start deep link on Windows/Linux comes in as a launch argument.
    const url = findDeepLink(process.argv);
    if (url) deliverDeepLink(url);
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
