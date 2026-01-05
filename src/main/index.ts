import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import log from 'electron-log/main';
import {LogFileWatcher} from './log-utils'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {  startInitialize, cleanupServerProcess,openBrowserWithType, addLog2Vue,sleep,getAppDir } from './utils'
import icon from '../../resources/icon.png?asset'
import {getConfValue, setConfValue,clearConf} from '../main/conf'
import { createWindows } from './windowUtils'
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
let logWindow: BrowserWindow | null = null
let logWatcher: LogFileWatcher | null = null;
let settingsWindow: BrowserWindow | null = null
let initializationStarted = false


const refreshMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    addLog2Vue('注意: 主窗口不可用，无法刷新')
    return
  }
  addLog2Vue('刷新成功...')
  mainWindow.webContents.reload()
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
    await resetWindowsSizeAndPosition()
    await sleep(200)
    await startInitialize()
  } catch (error) {
    const errorMessage = `应用初始化失败: ${(error as Error).message}`
    console.error('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', errorMessage)
  }
}

// 恢复窗口位置和大小
function resetWindowsSizeAndPosition(): void {
  // const size = windowStore.get('size', [900, 970]) as [number, number]
  const size = getConfValue('size', [900, 970], 'window') as [number, number]
  const position = getConfValue('position', [745, 210], 'window') as [number, number]
  // const position = windowStore.get('position', [745, 210]) as [number, number]
  mainWindow?.setSize(size[0], size[1])
  mainWindow?.setPosition(position[0], position[1])
}

function initLogConfig(){
  // 渲染进程中的console.log都会被捕获 https://github.com/megahertz/electron-log/blob/master/docs/initialize.md
  log.initialize({ spyRendererConsole: true });
  log.transports.file.resolvePathFn = () => join(getAppDir(),'logs/main.log')
  // log.transports.file.maxSize = 124
  log.warn('日志配置初始化成功')
}

// 记录日志
function addLog(msg: string, type: 'info' | 'error' | 'warning' | 'debug' = 'info'): void {
  if (type === 'info') {
    log.info(msg)
  } else if (type === 'error') {
    log.error(msg)
  } else if (type === 'warning') {
    log.warn(msg)
  } else if (type === 'debug') {
    log.debug(msg)
  }else  {
    log.log(msg)
  }
}
// 在浏览器中打开
function openInBrowser(): void {
  // const nodeStart = store.get('nodeStart', 'false') as string
  const nodeStart = getConfValue('nodeStart', 'false') as string
  if (nodeStart === 'false') {
    showMessageBox('程序未启动', 'error')
    return
  }
  // const finalUrl = store.get('finalUrl', '') as string
  const finalUrl = getConfValue('finalUrl','') as string
  if (finalUrl === '') {
    showMessageBox('地址配置错误', 'error')
    return
  }
  // const browserType = settingsStore.get('browserType', 'default') as string
  const browserType = getConfValue('browserType','default','settings') as string
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
      click: async () => {
        settingsWindow = await createWindows('设置',settingsWindow,mainWindow)
      }
    },
    {
      label: '关于',
      click: async () => {
        aboutWindow = await createWindows('关于',aboutWindow,mainWindow)
      }
    },{
      label: '日志',
      click: async () => {
        logWindow = await createWindows('日志',logWindow,mainWindow)
        logWindow.on('closed', () => {
          logWatcher?.cleanup()
        })
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
    frame: true,
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
  mainWindow?.on('resize', () => {
    // windowStore.set('size', mainWindow?.getSize() || [900, 970])
    setConfValue('size', mainWindow?.getSize() || [900, 970],'window')
  })
  mainWindow?.on('move', () => {
    // windowStore.set('position', mainWindow?.getPosition() || [745, 210])
    setConfValue('position', mainWindow?.getPosition() || [745, 210],'window')
  })


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
  // 初始化日志配置
  initLogConfig()
  // 创建菜单
  createMenu()

  // 创建窗口
  createWindow()
  // mainWindow?.loadURL('https://www.baidu.com')
  mainWindow?.on('ready-to-show', async () => {
    mainWindow?.setTitle(import.meta.env.VITE_APP_NAME || '应用标题');
    mainWindow?.show()
    // await runInitialization()
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
  // 添加日志
  ipcMain.on('add-log', (_event,log:string, type:'info' | 'error' | 'warning' | 'debug' = 'info') => {
    addLog(log,type)
  })
  ipcMain.on('log-list-close', async () => {
    if (logWatcher) {
      logWatcher.cleanup();
    }
  })
  // 监听日志列表准备好的信号
  ipcMain.on('log-list-ready', async () => {
    console.log('日志页面准备好接受数据了')
    isRendererReady = true
    // 先清理旧的监听（避免重复监听）
    if (logWatcher) {
      logWatcher.cleanup();
    }
    // 创建新的监听器实例
    logWatcher = new LogFileWatcher(log.transports.file.getFile().path)

    // 监听日志就绪事件（前50条日志）
    logWatcher.on('logReady', (first50Logs) => {
      first50Logs.forEach((log:string) => {addLog2Vue(log)})
      console.log('前50条日志：', first50Logs.length);
      // 这里可以将日志渲染到页面上，比如发送到Electron渲染进程
      // ipcMain.send('render-logs', first50Logs);
    });

    // 监听新增日志事件
    logWatcher.on('newLogs', (newLogs) => {
      newLogs.forEach((log:string) => {addLog2Vue(log)})
      // addLog2Vue(newLogs)
      console.log('实时新增日志：', newLogs.length);
      // 发送到渲染进程更新页面
      // ipcMain.send('render-new-logs', newLogs);
    });

    // 监听错误事件
    logWatcher.on('error', (errorMsg) => {
      addLog2Vue(errorMsg)
      console.error('日志监听错误：', errorMsg);
    });

    // 初始化监听
     await logWatcher.initWatch();
  })
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
  // 监听关闭设置窗口的请求
  ipcMain.on('close-window', (_event,name:string) => {
    if (name ==='设置' && settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
    }
    if (name ==='关于' && aboutWindow && !aboutWindow.isDestroyed()) {
      aboutWindow.close()
    }
  })


  // 保存设置
  ipcMain.on('get-conf-value',  (_event, conf: { key: string,defaultValue?: any,nameSpace?:string}) => {
    try {
      return  getConfValue(conf.key,conf.defaultValue,conf.nameSpace)
    } catch (error) {
      return ''
    }
  })

  ipcMain.handle('get-versions', () => {
    return {
      app: getConfValue('appVersion','1'), // 可以从package.json获取实际版本
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  })
  // 设置相关的 IPC 处理
  // 获取设置
  ipcMain.handle('get-settings', () => {
    // return {
    //   updateFrequency: settingsStore.get('updateFrequency', DEFAULT_SETTINGS.updateFrequency), // 默认：每次启动时
    //   startupActions: settingsStore.get('startupActions', DEFAULT_SETTINGS.startupActions), // 默认：空数组
    //   browserType: settingsStore.get('browserType', DEFAULT_SETTINGS.browserType) // 默认：默认浏览器
    // }
    return{
      updateFrequency: getConfValue('updateFrequency',DEFAULT_SETTINGS.updateFrequency,'settings'),
      startupActions: getConfValue('startupActions',DEFAULT_SETTINGS.startupActions,'settings'),
      browserType: getConfValue('browserType',DEFAULT_SETTINGS.browserType,'settings'),
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
      setConfValue('updateFrequency', updateFrequency,'settings')
      setConfValue('startupActions', startupActions,'settings')
      setConfValue('browserType', browserType,'settings')
      // settingsStore.set('updateFrequency', updateFrequency)
      // settingsStore.set('startupActions', startupActions)
      // settingsStore.set('browserType', browserType)
      return { success: true }
    } catch (error) {
      console.error('保存设置失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 重置设置
  ipcMain.handle('reset-settings', () => {
    try {
      clearConf('settings')
      clearConf('common')
      // settingsStore.clear()
      // store.clear()
      setConfValue('updateFrequency',DEFAULT_SETTINGS.updateFrequency,'settings')
      setConfValue('startupActions',DEFAULT_SETTINGS.startupActions,'settings')
      setConfValue('browserType',DEFAULT_SETTINGS.browserType,'settings')
      // settingsStore.set('updateFrequency', DEFAULT_SETTINGS.updateFrequency)
      // settingsStore.set('startupActions', [...DEFAULT_SETTINGS.startupActions])
      // settingsStore.set('browserType', DEFAULT_SETTINGS.browserType)
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

