import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {  startInitialize, cleanupServerProcess,openBrowserWithType, addLog2Vue,sleep } from './utils'
import icon from '../../resources/icon.png?asset'
import StorePkg from 'electron-store'
//@ts-ignore
const Store = StorePkg.default || StorePkg
const settingsStore = new Store({ name: 'settings' })
const store = new Store();
// 控制台管理员密码
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD  || 'admin123'

const DEFAULT_SETTINGS = {
  updateFrequency: 'onStart',
  startupActions: [] as string[],
  browserType: 'default'
} as const

// 日志缓冲队列
export let logBuffer: string[] = []
export type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}
export let downloadProgressBuffer: DownloadProgressPayload[] = []
export let isRendererReady = false


// 使用 import 方式导入 electron-store（主进程中使用）




let mainWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let initializationStarted = false


const refreshMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    addLog2Vue('注意: 主窗口不可用，无法刷新')
    return
  }
  addLog2Vue('刷新成功...')
  // mainWindow.webContents.reload()
  // void runInitialization()
}

const promptAdminPassword = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const channelId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const submitChannel = `admin-password:submit:${channelId}`
    const cancelChannel = `admin-password:cancel:${channelId}`
    let resolved = false

    const promptWindow = new BrowserWindow({
      width: 360,
      height: 220,
      parent: mainWindow || undefined,
      modal: true,
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      title: '管理员验证',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    const cleanup = () => {
      ipcMain.removeAllListeners(submitChannel)
      ipcMain.removeAllListeners(cancelChannel)
      if (!promptWindow.isDestroyed()) {
        promptWindow.close()
      }
    }

    ipcMain.once(submitChannel, (_event, password: string) => {
      resolved = true
      resolve(password)
      cleanup()
    })

    ipcMain.once(cancelChannel, () => {
      resolved = true
      resolve(null)
      cleanup()
    })

    promptWindow.on('closed', () => {
      if (!resolved) {
        resolve(null)
      }
      cleanup()
    })

    const html = `
      <html lang="zh-cn">
        <head>
          <meta charset="utf-8" />
          <title>管理员验证</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f7f7f7; }
            h2 { margin-top: 0; font-size: 18px; color: #333; }
            form { display: flex; flex-direction: column; gap: 12px; }
            input { padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px; }
            .actions { display: flex; justify-content: flex-end; gap: 8px; }
            button { padding: 6px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; }
            button.primary { background: #4f7cff; color: white; }
            button.secondary { background: #e0e0e0; }
          </style>
        </head>
        <body>
          <h2>请输入管理员密码</h2>
          <form id="password-form">
            <input id="password-input" type="password" placeholder="管理员密码" autofocus required />
            <div class="actions">
              <button type="button" class="secondary" id="cancel-btn">取消</button>
              <button type="submit" class="primary">确认</button>
            </div>
          </form>
          <script>
            const { ipcRenderer } = require('electron');
            const form = document.getElementById('password-form');
            const cancelBtn = document.getElementById('cancel-btn');
            const input = document.getElementById('password-input');

            cancelBtn.addEventListener('click', () => {
              ipcRenderer.send('${cancelChannel}');
            });

            form.addEventListener('submit', (event) => {
              event.preventDefault();
              ipcRenderer.send('${submitChannel}', input.value);
            });
          </script>
        </body>
      </html>
    `

    promptWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    promptWindow.once('ready-to-show', () => {
      promptWindow.show()
    })
  })
}

const verifyAdminAccess = async (): Promise<boolean> => {
  const password = await promptAdminPassword()
  if (password === null) {
    addLog2Vue('管理员操作已取消')
    return false
  }
  if (password !== ADMIN_PASSWORD) {
    await dialog.showMessageBox({
      type: 'error',
      title: '验证失败',
      message: '管理员密码错误，请重试。'
    })
    addLog2Vue('管理员密码校验失败')
    return false
  }
  addLog2Vue('管理员身份验证通过')
  return true
}

const toggleDevToolsWithAuth = async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }
  if (!mainWindow.webContents.isDevToolsOpened()) {
    const allowed = await verifyAdminAccess()
    if (!allowed) {
      return
    }
    mainWindow.webContents.openDevTools()
    addLog2Vue('开发者工具已打开')
  } else {
    mainWindow.webContents.closeDevTools()
    addLog2Vue('开发者工具已关闭')
  }
}

const runInitialization = async () => {
  if (initializationStarted) return
  initializationStarted = true
  try {
    await sleep(1500)
    await startInitialize()
  } catch (error) {
    const errorMessage = `应用初始化失败: ${(error as Error).message}`
    console.error('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', errorMessage)
  }
}

// 创建关于窗口
function createAboutWindow(): void {
  // 如果窗口已存在且未销毁，则聚焦到该窗口
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus()
    return
  }

  // 创建新窗口
  aboutWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    icon:join(__dirname, getIconPaht()),
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true
    },
    parent: mainWindow || undefined, // 设置父窗口
    modal: false // 非模态窗口
  })

  // 窗口准备好后显示
  aboutWindow.once('ready-to-show', () => {
    aboutWindow?.show()
  })

  // 窗口关闭时清理引用
  aboutWindow.on('closed', () => {
    aboutWindow = null
  })

  // 加载URL，使用hash路由
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    aboutWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/about`)
  } else {
    // 生产环境：先加载文件，然后在页面加载完成后导航到 about 页面
    aboutWindow.loadFile(join(__dirname, '../renderer/index.html'))
    aboutWindow.webContents.once('did-finish-load', () => {
      aboutWindow?.webContents.executeJavaScript(`
        if (window.location.hash !== '#/about') {
          window.location.hash = '#/about'
        }
      `)
    })
  }

  // 开发模式下打开开发者工具
  if (is.dev) {
    aboutWindow.webContents.openDevTools()
  }
}

// 创建设置窗口
function createSettingsWindow(): void {
  // 如果窗口已存在且未销毁，则聚焦到该窗口
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  // 创建新窗口
  settingsWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    icon:join(__dirname, getIconPaht()),
    autoHideMenuBar: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true
    },
    parent: mainWindow || undefined,
    modal: false
  })

  // 窗口准备好后显示
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })

  // 窗口关闭时清理引用
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  // 加载URL，使用hash路由
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
    settingsWindow.webContents.once('did-finish-load', () => {
      settingsWindow?.webContents.executeJavaScript(`
        if (window.location.hash !== '#/settings') {
          window.location.hash = '#/settings'
        }
      `)
    })
  }

  // 开发模式下打开开发者工具
  if (is.dev) {
    settingsWindow.webContents.openDevTools()
  }
}


// 在浏览器中打开
function openInBrowser(): void {
  const nodeStart = store.get('nodeStart', 'false') as string
  if (nodeStart === 'false') {
    showMessageBox('程序未启动', 'error')
    return
  }
  const finalUrl = store.get('finalUrl', '') as string
  if (finalUrl === '') {
    showMessageBox('地址配置错误', 'error')
    return
  }
  const browserType = settingsStore.get('browserType', 'default') as string
  openBrowserWithType(finalUrl, browserType)
}

// 创建菜单
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // 可以在这里添加新建文件的逻辑
            console.log('新建文件')
          }
        },
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // 可以在这里添加打开文件的逻辑
            console.log('打开文件')
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '浏览器中打开',
      click: () => {
        openInBrowser()
      }
    },
    {
      label: '刷新',
      accelerator: 'CmdOrCtrl+R',
      click: () => {
        refreshMainWindow()
      }
    },
    {
      label: '设置',
      click: () => {
        // 创建新窗口显示设置页面
        createSettingsWindow()
      }
    },
    {
      label: '关于',
      click: () => {
        // 创建新窗口显示关于页面
        createAboutWindow()
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 获取图标
function getIconPaht(): string {
  let iconPath = '../../resources/image/icon.png'
  if(import.meta.env.VITE_APP_ICON){
    iconPath= '../../resources/'+ import.meta.env.VITE_APP_ICON
  }
  return iconPath
}
// 创建并显示窗口
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 970,
    show: true, // 立即显示窗口
    autoHideMenuBar: false,
    icon:join(__dirname, getIconPaht()),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true, // 启用开发者工具
      contextIsolation: true // 启用上下文隔离
    }
  })

  // Open the DevTools automatically in development mode
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
mainWindow.webContents.openDevTools()
  mainWindow?.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '刷新',
      accelerator: 'CmdOrCtrl+R',
      click: () => refreshMainWindow()
    },
    { type: 'separator' },
    {
      label: '复制',
      role: 'copy'
    },
    {
      label: '粘贴',
      role: 'paste'
    },
    {
      label: '全选',
      role: 'selectAll'
    },
    { type: 'separator' },
    {
      label: '开发者工具',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: () => {
        toggleDevToolsWithAuth().catch(console.error)
      }
    }
  ])

  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
    if (mainWindow && !mainWindow.isDestroyed()) {
      contextMenu.popup({ window: mainWindow })
    }
  })
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // console.log('开发环境，加载远程URL:', process.env['ELECTRON_RENDERER_URL']);
    
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
      // console.log('生产环境，加载本地HTML文件:', join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}






// 应用退出时清理服务器进程
app.on('before-quit', () => {
  cleanupServerProcess()
})

// 窗口关闭时也清理
app.on('window-all-closed', () => {
  cleanupServerProcess()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 进程退出时清理
process.on('exit', () => {
  cleanupServerProcess()
})

// 捕获未处理的异常和退出信号
process.on('SIGINT', () => {
  cleanupServerProcess()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanupServerProcess()
  process.exit(0)
})


// 消息框工具函数
async function showMessageBox(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') {
  const dialogType: 'info' | 'error' | 'warning' | 'none' = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'
  const options: Electron.MessageBoxOptions = {
    type: dialogType,
    title: type === 'success' ? '成功' : type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示',
    message: message,
    buttons: ['确定']
  }

  const targetWindow = settingsWindow && !settingsWindow.isDestroyed() 
    ? settingsWindow 
    : aboutWindow && !aboutWindow.isDestroyed() 
      ? aboutWindow 
      : mainWindow

  if (targetWindow) {
    await dialog.showMessageBox(targetWindow, options)
  } else {
    await dialog.showMessageBox(options)
  }
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // 跳过下载更新的地址
  // app.commandLine.appendSwitch('proxy-bypass-list', '*.toolsetlink.com;*.qq.com')
  // 创建菜单
  createMenu()

  // 创建窗口
  createWindow()
  // mainWindow?.loadURL('https://www.baidu.com')
  mainWindow?.on('ready-to-show', async () => {
    mainWindow?.show()
    await runInitialization()
  })


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

  // 监听渲染进程准备好的信号
  ipcMain.on('renderer-ready', () => {
    console.log('Renderer is ready, sending buffered logs')
    isRendererReady = true
    // 发送缓冲的日志
    logBuffer.forEach(log => {
      addLog2Vue(log)
    })
    logBuffer = [] // 清空缓冲区
    downloadProgressBuffer.forEach(payload => {
      mainWindow?.webContents.send('download-progress', payload)
    })
    downloadProgressBuffer = []
  })

  // 监听关闭关于窗口的请求
  ipcMain.on('close-about-window', () => {
    if (aboutWindow && !aboutWindow.isDestroyed()) {
      aboutWindow.close()
    }
  })

  // 监听关闭设置窗口的请求
  ipcMain.on('close-settings-window', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
    }
  })

  // 设置相关的 IPC 处理
  // 获取设置
  ipcMain.handle('get-settings', () => {
    return {
      updateFrequency: settingsStore.get('updateFrequency', DEFAULT_SETTINGS.updateFrequency), // 默认：每次启动时
      startupActions: settingsStore.get('startupActions', DEFAULT_SETTINGS.startupActions), // 默认：空数组
      browserType: settingsStore.get('browserType', DEFAULT_SETTINGS.browserType) // 默认：默认浏览器
    }
  })

  // 保存设置
  ipcMain.handle('save-settings', (_event, settings: { updateFrequency: string; startupActions: string[]; browserType?: string }) => {
    try {
      // 确保数据是可序列化的
      const updateFrequency = String(settings.updateFrequency || 'onStart')
      const startupActions = Array.isArray(settings.startupActions) 
        ? settings.startupActions.map(String) 
        : []
      const browserType = String(settings.browserType || 'default')
      
      settingsStore.set('updateFrequency', updateFrequency)
      settingsStore.set('startupActions', startupActions)
      settingsStore.set('browserType', browserType)
      return { success: true }
    } catch (error) {
      console.error('保存设置失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 重置设置
  ipcMain.handle('reset-settings', () => {
    try {
      settingsStore.clear()
      store.clear()
      settingsStore.set('updateFrequency', DEFAULT_SETTINGS.updateFrequency)
      settingsStore.set('startupActions', [...DEFAULT_SETTINGS.startupActions])
      settingsStore.set('browserType', DEFAULT_SETTINGS.browserType)
      return { success: true, settings: { ...DEFAULT_SETTINGS, startupActions: [...DEFAULT_SETTINGS.startupActions] } }
    } catch (error) {
      console.error('重置设置失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  

  ipcMain.handle('show-message', async (_event, message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    await showMessageBox(message, type)
  })



  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

