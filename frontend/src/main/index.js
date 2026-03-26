import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'
import { createWriteStream, mkdirSync } from 'fs'
import { get } from 'http'

let backendProcess = null

function getLogStream() {
  const logDir = join(app.getPath('userData'), 'logs')
  mkdirSync(logDir, { recursive: true })
  return createWriteStream(join(logDir, 'backend.log'), { flags: 'a' })
}

function startBackend() {
  const isDev = is.dev
  let backendPath, args, env

  if (isDev) {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    backendPath = pythonCmd
    args = [join(__dirname, '../../..', 'backend', 'main.py')]
    env = process.env
  } else {
    backendPath = join(process.resourcesPath, 'backend', 'python-embed', 'python.exe')
    args = [join(process.resourcesPath, 'backend', 'main.py')]
    env = {
      ...process.env,
      CRISIS_DATA_DIR: join(process.resourcesPath, 'data'),
      PYTHONPATH: join(process.resourcesPath, 'backend')
    }
  }

  const logStream = getLogStream()
  logStream.write(`\n[${new Date().toISOString()}] Starting backend: ${backendPath} ${args.join(' ')}\n`)

  backendProcess = spawn(backendPath, args, {
    detached: false,
    stdio: 'pipe',
    env
  })

  backendProcess.stdout.on('data', (data) => {
    logStream.write(`[stdout] ${data}`)
    console.log(`[backend] ${data}`)
  })

  backendProcess.stderr.on('data', (data) => {
    logStream.write(`[stderr] ${data}`)
    console.error(`[backend] ${data}`)
  })

  backendProcess.on('close', (code) => {
    logStream.write(`[exit] code=${code}\n`)
    console.log(`[backend] process exited with code ${code}`)
  })

  backendProcess.on('error', (err) => {
    logStream.write(`[error] ${err.message}\n`)
    console.error(`[backend] failed to start: ${err.message}`)
  })
}

function waitForBackend(retries = 30, delay = 1000) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      get('http://127.0.0.1:8000/api/health', (res) => {
        if (res.statusCode === 200) resolve()
        else if (n > 0) setTimeout(() => attempt(n - 1), delay)
        else resolve()
      }).on('error', () => {
        if (n > 0) setTimeout(() => attempt(n - 1), delay)
        else resolve()
      })
    }
    attempt(retries)
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('ru.crisistrainer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  startBackend()
  await waitForBackend()
  createWindow()

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
