import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 环境变量检查
const getEnvPath = (): string => {
  // 在开发环境中使用项目根目录，在生产环境中使用app路径
  if (is.dev) {
    return join(__dirname, '../../.env')
  }
  return join(app.getAppPath(), '.env')
}

const parseEnvFile = (content: string): void => {
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      // 加载到 process.env
      process.env[key] = value
    }
  }
}

const loadEnvFile = (): void => {
  const envPath = getEnvPath()
  if (!existsSync(envPath)) {
    return
  }
  
  try {
    const content = readFileSync(envPath, 'utf-8')
    parseEnvFile(content)
  } catch (error) {
    console.error('读取 .env 文件失败:', error)
  }
}

const checkRequiredEnvVars = (): { valid: boolean; missing: string[] } => {
  const requiredVars = ['UL_CONF_AK', 'UL_CONF_SK', 'UL_CONF_FILEKEY', 'UL_CONF_URL']
  const missing: string[] = []
  
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      missing.push(varName)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

const showConfigError = (missingVars: string[]): void => {
  const message = `缺少必要的环境变量配置：\n\n${missingVars.map(v => `- ${v}`).join('\n')}\n\n请在项目根目录的 .env 文件中配置这些变量。`
  
  dialog.showErrorBox('配置错误', message)
  app.quit()
}

// 在应用启动时加载环境变量
loadEnvFile()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 检查必需的环境变量
  const envCheck = checkRequiredEnvVars()
  if (!envCheck.valid) {
    showConfigError(envCheck.missing)
    return
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
