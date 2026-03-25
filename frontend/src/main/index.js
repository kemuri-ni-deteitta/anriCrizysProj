import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'

let backendProcess = null

function startBackend() {
  const isDev = is.dev

  // In development, run the Python script directly
  // In production, run the bundled executable or script from extraResources
  const backendPath = isDev
    ? join(__dirname, '../../..', 'backend', 'main.py')
    : join(process.resourcesPath, 'backend', 'main.py')

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

  backendProcess = spawn(pythonCmd, [backendPath], {
    detached: false,
    stdio: 'pipe'
  })

  backendProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`[backend] ${data}`)
  })

  backendProcess.on('close', (code) => {
    console.log(`[backend] process exited with code ${code}`)
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 480,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('ru.crisistrainer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  startBackend()

  // Wait a moment for the backend to start before opening the window
  setTimeout(createWindow, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
