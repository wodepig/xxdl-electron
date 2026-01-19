import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'
import { LogFileWatcher } from './log-utils'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { startInitialize,deleteAppData, cleanupServerProcess, addLog2Vue, sendLatestLogToMainWindow, sleep, getAppDir } from './utils'
import { getConfValue, setConfValue, clearConf, getEnvConf } from '../main/conf'
import { createMainWindow, createMenu ,showMessageBox} from './windowUtils'

const DEFAULT_SETTINGS = {
  updateFrequency: 'onStart',
  startupActions: [] as string[],
  browserType: 'default'
} as const

export type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}
export let downloadProgressBuffer: DownloadProgressPayload[] = []
export let isRendererReady = false

let mainWindow: BrowserWindow | null = null
let logWatcher: LogFileWatcher | null = null
let initializationStarted = false

// 监听日志
const listingLog = async () =>{
  isRendererReady = true
  // 先清理旧的监听（避免重复监听）
  if (logWatcher) {
    logWatcher.cleanup()
  }
  // 创建新的监听器实例
  logWatcher = new LogFileWatcher(log.transports.file.getFile().path)

  // 监听日志就绪事件（前50条日志）
  logWatcher.on('logReady', (first50Logs) => {
    first50Logs.forEach((msg: string) => {
      addLog2Vue(msg)
    })
  })

  // 监听新增日志事件
  logWatcher.on('newLogs', (newLogs) => {
    newLogs.forEach((msg: string) => {
      addLog2Vue(msg)
      // 向首页发送最新的一条日志
      sendLatestLogToMainWindow(msg)
    })
  })

  // 监听错误事件
  logWatcher.on('error', (errorMsg) => {
    addLog2Vue(errorMsg)
    console.error('日志监听错误：', errorMsg)
  })

  // 初始化监听
  await logWatcher.initWatch()
}
// 初始化程序
const runInitialization = async () => {
  if (initializationStarted) return
  initializationStarted = true
  try {
    await listingLog()
    await sleep(200)
    await startInitialize()
  } catch (error) {
    const errorMessage = `应用初始化失败: ${(error as Error).message}`
    log.warn('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', errorMessage)
  }
}

// 初始化日志配置
function initLogConfig() {
  // 渲染进程中的console.log都会被捕获 https://github.com/megahertz/electron-log/blob/master/docs/initialize.md
  log.initialize({ spyRendererConsole: false })
  log.transports.file.resolvePathFn = () => join(getAppDir(), 'logs/main.log')
  // log.transports.file.maxSize = 124
  log.warn('日志配置初始化成功')
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
  // 跳过下载更新的地址
  // app.commandLine.appendSwitch('proxy-bypass-list', '*.toolsetlink.com;*.qq.com')
  // 初始化日志配置
  initLogConfig()

  // 创建窗口
  mainWindow = await createMainWindow()

  // mainWindow?.loadURL('https://www.baidu.com')
  mainWindow?.on('ready-to-show', async () => {
    // 创建菜单
    createMenu()
    mainWindow?.show()

    await runInitialization()
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId(getEnvConf('VITE_APP_ID'))
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('log-list-close', async () => {
    if (logWatcher) {
      logWatcher.cleanup()
    }
  })
  // 监听日志列表准备好的信号
  ipcMain.on('log-list-ready', async () => {
    await listingLog()
  })

  // 保存设置
  ipcMain.handle(
    'get-conf-value',
    (_event, conf: { key: string; defaultValue?: any; nameSpace?: string }) => {
      try {
        return getConfValue(conf.key, conf.defaultValue, conf.nameSpace)
      } catch (error) {
        return ''
      }
    }
  )
  // 设置相关的 IPC 处理
  // 获取设置
  ipcMain.handle('get-settings', () => {
    return {
      updateFrequency: getConfValue(
        'updateFrequency',
        DEFAULT_SETTINGS.updateFrequency,
        'settings'
      ),
      startupActions: getConfValue('startupActions', DEFAULT_SETTINGS.startupActions, 'settings'),
      browserType: getConfValue('browserType', DEFAULT_SETTINGS.browserType, 'settings')
    }
  })

  // 保存设置
  ipcMain.handle(
    'save-settings',
    (
      _event,
      settings: { updateFrequency: string; startupActions: string[]; browserType?: string }
    ) => {
      try {
        // 确保数据是可序列化的
        const updateFrequency = String(settings.updateFrequency || 'onStart')
        const startupActions = Array.isArray(settings.startupActions)
          ? settings.startupActions.map(String)
          : []
        const browserType = String(settings.browserType || 'default')
        setConfValue('updateFrequency', updateFrequency, 'settings')
        setConfValue('startupActions', startupActions, 'settings')
        setConfValue('browserType', browserType, 'settings')
        return { success: true }
      } catch (error) {
        console.error('保存设置失败:', error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 重置设置
  ipcMain.handle('reset-settings', () => {
    try {
      log.info('重置设置')
      clearConf('settings')
      clearConf('common')
      setConfValue('updateFrequency', DEFAULT_SETTINGS.updateFrequency, 'settings')
      setConfValue('distVersion', '1')
      setConfValue('startupActions', DEFAULT_SETTINGS.startupActions, 'settings')
      setConfValue('browserType', DEFAULT_SETTINGS.browserType, 'settings')
      deleteAppData()
      return {
        success: true,
        settings: { ...DEFAULT_SETTINGS, startupActions: [...DEFAULT_SETTINGS.startupActions] }
      }
    } catch (error) {
      console.error('重置设置失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(
    'show-message',
    async (_event, message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
      await showMessageBox(message, type)
      // console.log('show-message', message, type)
    }
  )
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
