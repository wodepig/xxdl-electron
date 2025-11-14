

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'


import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { loadEnvFile, startInitialize, cleanupServerProcess } from './utils'
import icon from '../../resources/icon.png?asset'


// 使用 import 方式导入 electron-store（主进程中使用）




let mainWindow: BrowserWindow | null = null

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
  if(process.env['ELECTRON_RENDERER_URL']){
    console.log(1);
    
    mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL'])
  }
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  //   console.log('开发环境，加载远程URL:', process.env['ELECTRON_RENDERER_URL']);
    
  //   mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  // } else {
  //     console.log('生产环境，加载本地HTML文件:', join(__dirname, '../renderer/index.html'));
  //   mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  // }
}


/**
 * 应用初始化方法
 */
const initialize = async (): Promise<void> => {
  
  try {
    startInitialize()
  } catch (error) {
    const errorMessage = `应用初始化失败: ${(error as Error).message}`
    console.error('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', errorMessage)
    // app.quit()
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



// 设置 stdout 和 stderr 的编码
// if (process.stdout.setDefaultEncoding) {
//   process.stdout.setDefaultEncoding('utf8')
// }
// if (process.stderr.setDefaultEncoding) {
//   process.stderr.setDefaultEncoding('utf8')
// }



// 重写 console.log 和 console.error 确保中文正确输出
// const originalLog = console.log
// const originalError = console.error

// console.log = (...args: any[]) => {
//   const message = args.map(arg => {
//     if (typeof arg === 'string') {
//       return Buffer.from(arg, 'utf8').toString('utf8')
//     }
//     return arg
//   }).join(' ')
//   originalLog(message)
// }

// console.error = (...args: any[]) => {
//   const message = args.map(arg => {
//     if (typeof arg === 'string') {
//       return Buffer.from(arg, 'utf8').toString('utf8')
//     }
//     return arg
//   }).join(' ')
//   originalError(message)
// }



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // 设置编码支持中文
  //   try {
  //   execSync('chcp 65001 >nul 2>&1', { shell: 'cmd.exe' })
  // } catch (error) {
  //   // 忽略错误，继续执行
  // }
  // 创建日志窗口
  createWindow()
  console.log(3);
      // 在窗口准备好的时候发送测试消息
    // await loadEnvFile()

    // 执行初始化操作
    await initialize()
  // mainWindow?.loadURL('https://www.baidu.com')
  mainWindow?.on('ready-to-show', async () => {
    mainWindow?.show()
    console.log('窗口准备好' + 2);
    

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



  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
