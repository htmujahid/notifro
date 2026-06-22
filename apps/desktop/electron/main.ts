import { BrowserWindow, app } from "electron"
import started from "electron-squirrel-startup"
import path from "node:path"

const APP_SCHEME = "renderical"
const DEEP_LINK_CHANNEL = "deep-link"

if (started) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let pendingDeepLink: string | null = null

if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(APP_SCHEME, process.execPath, [
    path.resolve(process.argv[1]),
  ])
} else {
  app.setAsDefaultProtocolClient(APP_SCHEME)
}

function deliverDeepLink(url: string) {
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    mainWindow.webContents.send(DEEP_LINK_CHANNEL, url)
  } else {
    pendingDeepLink = url
  }
}

function findDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${APP_SCHEME}://`)) ?? null
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  mainWindow.webContents.once("did-finish-load", () => {
    if (pendingDeepLink) {
      mainWindow?.webContents.send(DEEP_LINK_CHANNEL, pendingDeepLink)
      pendingDeepLink = null
    }
  })

  mainWindow.webContents.openDevTools()
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (_event, argv) => {
    const url = findDeepLink(argv)
    if (url) deliverDeepLink(url)
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    deliverDeepLink(url)
  })

  app.on("ready", () => {
    createWindow()
    const url = findDeepLink(process.argv)
    if (url) deliverDeepLink(url)
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
