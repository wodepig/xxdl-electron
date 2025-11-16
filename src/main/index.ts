import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {  startInitialize, cleanupServerProcess, addLog2Vue } from './utils'
import icon from '../../resources/icon.png?asset'

// 日志缓冲队列
export let logBuffer: string[] = []
export let isRendererReady = false


// 使用 import 方式导入 electron-store（主进程中使用）




let mainWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null

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
    height: 800,
    show: false,
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

// 创建并显示窗口
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 970,
    show: true, // 立即显示窗口
    autoHideMenuBar: false,
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





// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // 创建菜单
  createMenu()

  // 创建窗口
  createWindow()
 
    // 执行初始化操作
  try {
    // startInitialize()

  } catch (error) {
    const errorMessage = `应用初始化失败: ${(error as Error).message}`
    console.error('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', errorMessage)
    // app.quit()
  }
  // mainWindow?.loadURL('https://www.baidu.com')
  mainWindow?.on('ready-to-show', async () => {
    mainWindow?.show()
    

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
  })

  // 监听关闭关于窗口的请求
  ipcMain.on('close-about-window', () => {
    if (aboutWindow && !aboutWindow.isDestroyed()) {
      aboutWindow.close()
    }
  })



  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

