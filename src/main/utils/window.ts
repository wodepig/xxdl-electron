// 窗口和菜单工具类
import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'
import { getConfValue, setConfValue, getEnvConf } from './config'
import { openBrowserWithType } from './browser'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'

// ==================== 常量定义 ====================

const MAIN_WINDOW_NAME = getEnvConf('VITE_APP_EXE_NAME')

const WINDOW_NAMES = {
  SETTINGS: '设置',
  VERSION: '版本',
  LOG: '日志',
  ABOUT: '关于'
} as const

type WindowName = typeof WINDOW_NAMES[keyof typeof WINDOW_NAMES] | string

// 窗口路由映射
const WINDOW_ROUTES: Record<string, string> = {
  [MAIN_WINDOW_NAME]: '/',
  [WINDOW_NAMES.SETTINGS]: '/settings',
  [WINDOW_NAMES.VERSION]: '/version',
  [WINDOW_NAMES.LOG]: '/log',
  [WINDOW_NAMES.ABOUT]: '/about'
}

// 窗口默认配置
const WINDOW_DEFAULTS = {
  SIZE: [900, 970] as [number, number],
  POSITION: [745, 210] as [number, number],
  WIDTH: 1000,
  HEIGHT: 900
} as const

// 菜单创建标志，确保只创建一次
let isMenuCreated = false

// 主窗口缓存
let cachedMainWindow: BrowserWindow | undefined
let lastCacheTime = 0
const CACHE_TTL = 1000 // 缓存有效期 1 秒

// ==================== 工具函数 ====================

const isMainWindow = (name: string): boolean => name === MAIN_WINDOW_NAME

/**
 * 获取主窗口实例（带缓存）
 */
export const getMainWindow = (): BrowserWindow | undefined => {
  const now = Date.now()
  if (cachedMainWindow && !cachedMainWindow.isDestroyed() && (now - lastCacheTime) < CACHE_TTL) {
    return cachedMainWindow
  }

  const windowByTitle = getWindowsByTitle(MAIN_WINDOW_NAME)
  if (windowByTitle && !windowByTitle.isDestroyed()) {
    cachedMainWindow = windowByTitle
    lastCacheTime = now
    return windowByTitle
  }

  const mainWindow = BrowserWindow.getAllWindows().find(win =>
    !win.isDestroyed() && !win.getParentWindow()
  )

  cachedMainWindow = mainWindow
  lastCacheTime = now
  return mainWindow
}

export const clearMainWindowCache = (): void => {
  cachedMainWindow = undefined
  lastCacheTime = 0
}

const getWindowRoute = (name: string): string => WINDOW_ROUTES[name] ?? '/about'

const getIconPath = (): string => {
  const iconFromEnv = import.meta.env.VITE_APP_ICON
  return iconFromEnv ? `../../resources/${iconFromEnv}` : '../../resources/image/icon.png'
}

/**
 * 防抖函数
 */
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 防抖保存窗口尺寸和位置
const debouncedSaveSize = debounce((win: BrowserWindow, name: string) => {
  setConfValue(`${name}.size`, win.getSize(), 'window')
}, 500)

const debouncedSavePosition = debounce((win: BrowserWindow, name: string) => {
  setConfValue(`${name}.position`, win.getPosition(), 'window')
}, 500)

/**
 * 创建窗口配置
 */
const createWindowConfig = (name: string, parent?: BrowserWindow | null): Electron.BrowserWindowConstructorOptions => {
  const isMain = isMainWindow(name)
  return {
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    show: false,
    autoHideMenuBar: !isMain,
    resizable: true,
    icon: join(__dirname, getIconPath()),
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true,
      partition: isMain ? 'persist:main' : undefined
    },
    parent: parent || undefined,
    modal: false
  }
}

/**
 * 注册窗口事件
 */
const setupWindowEventListeners = (win: BrowserWindow, name: string, autoShow: boolean, parent?: BrowserWindow | null): void => {
  win.once('ready-to-show', () => {
    win.setTitle(name)
    resetWindowsSizeAndPosition(name)

    if (autoShow) {
      win.show()
      log.info(`子窗口 ${name} 已显示`)
    }

    if (isMainWindow(name) && !isMenuCreated) {
      setImmediate(() => ensureMenuCreated(win))
    }
  })

  win.on('resize', () => debouncedSaveSize(win, name))
  win.on('move', () => debouncedSavePosition(win, name))

  win.on('closed', () => {
    if (isMainWindow(name)) {
      clearMainWindowCache()
    }
  })

  // 子窗口关闭时恢复父窗口焦点
  if (!isMainWindow(name) && parent) {
    win.on('close', () => {
      setTimeout(() => {
        if (parent && !parent.isDestroyed()) {
          if (parent.isMinimized()) parent.restore()
          parent.focus()
        }
      }, 100)
    })
  }
}

/**
 * 创建右键菜单
 */
const createContextMenu = (mainWindow: BrowserWindow) => Menu.buildFromTemplate([
  { label: '刷新', accelerator: 'CmdOrCtrl+R', click: () => refreshWindow(mainWindow) },
  { type: 'separator' },
  { label: '复制', role: 'copy' },
  { label: '粘贴', role: 'paste' },
  { label: '全选', role: 'selectAll' },
  { type: 'separator' },
  {
    label: '开发者工具',
    accelerator: 'CmdOrCtrl+Shift+I',
    click: () => toggleDevToolsWithAuth().catch(console.error)
  }
])

/**
 * 创建主窗口
 */
export const createMainWindow = async (): Promise<BrowserWindow | null> => {
  const mainWindow = await createWindows(MAIN_WINDOW_NAME, null, false)
  if (!mainWindow) return null

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const contextMenu = createContextMenu(mainWindow)
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
    if (!mainWindow.isDestroyed()) contextMenu.popup({ window: mainWindow })
  })

  return mainWindow
}

/**
 * 确保应用菜单已创建
 */
export const ensureMenuCreated = (mainWindow: BrowserWindow | null): void => {
  if (isMenuCreated || !mainWindow || mainWindow.isDestroyed()) return

  try {
    createMenu(mainWindow)
    isMenuCreated = true
    log.info('应用菜单创建成功')
  } catch (error) {
    log.error('创建应用菜单失败:', error)
  }
}

/**
 * 加载窗口路由
 */
const loadWindowRoute = (win: BrowserWindow, pageUrl: string): void => {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${pageUrl}`)
    return
  }

  const htmlPath = join(__dirname, '../renderer/index.html')
  win.loadFile(htmlPath, { hash: pageUrl }).catch(() => {
    // 降级方案：通过JS设置路由
    win.loadFile(htmlPath).then(() => {
      setTimeout(() => {
        win.webContents.executeJavaScript(`
          if (window.location.hash !== '#${pageUrl}') {
            window.location.hash = '#${pageUrl}';
          }
        `).catch(e => log.error('设置路由失败:', e))
      }, 500)
    })
  })
}

/**
 * 创建窗口
 */
export const createWindows = async (
  name: string,
  parent?: BrowserWindow | null,
  autoShow = true
): Promise<BrowserWindow | undefined> => {
  const existsWindow = getWindowsByTitle(name)
  if (existsWindow) {
    existsWindow.focus()
    return existsWindow
  }

  const win = new BrowserWindow(createWindowConfig(name, parent))
  setupWindowEventListeners(win, name, autoShow, parent)
  loadWindowRoute(win, getWindowRoute(name))

  if (is.dev) win.webContents.openDevTools()
  return win
}

/**
 * 根据标题获取窗口
 */
export const getWindowsByTitle = (titleName: string): BrowserWindow | undefined =>
  BrowserWindow.getAllWindows().find(win => win.getTitle() === titleName)

/**
 * 刷新窗口
 */
const refreshWindow = (win: BrowserWindow | undefined): void => {
  if (win && !win.isDestroyed()) win.webContents.reload()
}

/**
 * 创建菜单点击处理器
 */
const createMenuClickHandler = (callback: (win: BrowserWindow) => unknown) =>
  () => {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      Promise.resolve(callback(mainWindow)).catch(err => log.error('菜单操作失败:', err))
    } else {
      log.warn('主窗口不可用')
    }
  }

/**
 * 创建菜单
 */
export const createMenu = (mainWindow?: BrowserWindow | null): void => {
  const win = mainWindow || getMainWindow()
  if (!win) {
    log.warn('创建菜单失败: 主窗口不存在')
    return
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => log.info('新建文件') },
        { label: '打开', accelerator: 'CmdOrCtrl+O', click: () => log.info('打开文件') },
        { type: 'separator' },
        { label: '退出', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', click: () => app.quit() }
      ]
    },
    { label: '浏览器中打开', click: createMenuClickHandler(() => openInBrowser()) },
    { label: '刷新', accelerator: 'CmdOrCtrl+R', click: createMenuClickHandler(refreshWindow) },
    { label: '设置', click: createMenuClickHandler(win => { createWindows(WINDOW_NAMES.SETTINGS, win) }) },
    { label: '关于', click: createMenuClickHandler(win => { createWindows(WINDOW_NAMES.ABOUT, win) }) },
    { label: '日志', click: createMenuClickHandler(win => { createWindows(WINDOW_NAMES.LOG, win) }) }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * 在浏览器中打开
 */
const openInBrowser = (): void => {
  const nodeStart = getConfValue('nodeStart', 'false') as string
  if (nodeStart !== 'true') {
    showMessageBox('程序未启动', 'error')
    return
  }

  const finalUrl = getConfValue('finalUrl', '') as string
  if (!finalUrl) {
    showMessageBox('地址配置错误', 'error')
    return
  }

  openBrowserWithType(finalUrl, getConfValue('browserType', 'default', 'settings') as string)
}

/**
 * 获取最佳对话框窗口
 */
const getBestWindowForDialog = (): BrowserWindow | undefined =>
  [getWindowsByTitle(WINDOW_NAMES.SETTINGS), getWindowsByTitle(WINDOW_NAMES.ABOUT), getMainWindow()]
    .find(win => win && !win.isDestroyed())

/**
 * 消息框工具
 */
export async function showMessageBox(
  message: string,
  type: 'info' | 'error' | 'warning' | 'success' = 'info'
): Promise<void> {
  const typeMap: Record<string, 'info' | 'error' | 'warning' | 'none'> = { error: 'error', warning: 'warning' }
  const titleMap: Record<string, string> = { success: '成功', error: '错误', warning: '警告' }

  const options: Electron.MessageBoxOptions = {
    type: typeMap[type] ?? 'info',
    title: titleMap[type] ?? '提示',
    message,
    buttons: ['确定']
  }

  const targetWindow = getBestWindowForDialog()
  if (targetWindow) {
    await dialog.showMessageBox(targetWindow, options)
  } else {
    await dialog.showMessageBox(options)
  }
}

// ==================== 开发者工具 ====================

const toggleDevToolsWithAuth = async (): Promise<void> => {
  const mainWindow = getMainWindow()
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (!mainWindow.webContents.isDevToolsOpened()) {
    const allowed = await verifyAdminAccess()
    if (allowed) mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.closeDevTools()
  }
}

const verifyAdminAccess = async (): Promise<boolean> => {
  const password = await promptAdminPassword()
  if (password === null) return false

  const ADMIN_PASSWORD = getEnvConf('VITE_ADMIN_PASSWORD')
  if (password !== ADMIN_PASSWORD) {
    await dialog.showMessageBox({ type: 'error', title: '验证失败', message: '管理员密码错误' })
    log.warn('管理员密码校验失败')
    return false
  }
  return true
}

/**
 * 管理员密码验证窗口
 */
const promptAdminPassword = (): Promise<string | null> => {
  const mainWindow = getMainWindow()
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
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    })

    const cleanup = () => {
      try {
        ipcMain.removeListener(submitChannel, submitHandler)
        ipcMain.removeListener(cancelChannel, cancelHandler)
      } catch { }
      if (!promptWindow.isDestroyed()) promptWindow.close()
    }

    const submitHandler = (_event: any, password: string) => { resolved = true; resolve(password); cleanup() }
    const cancelHandler = () => { resolved = true; resolve(null); cleanup() }

    ipcMain.once(submitChannel, submitHandler)
    ipcMain.once(cancelChannel, cancelHandler)

    promptWindow.on('closed', () => { if (!resolved) resolve(null) })

    const html = `<html lang="zh-cn"><head><meta charset="utf-8"/><title>管理员验证</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:20px;background:#f7f7f7}
      h2{margin-top:0;font-size:18px;color:#333}
      form{display:flex;flex-direction:column;gap:12px}
      input{padding:8px;border-radius:4px;border:1px solid #ccc;font-size:14px}
      .actions{display:flex;justify-content:flex-end;gap:8px}
      button{padding:6px 16px;border-radius:4px;border:none;cursor:pointer;font-size:14px}
      button.primary{background:#4f7cff;color:white}
      button.secondary{background:#e0e0e0}</style></head>
      <body><h2>请输入管理员密码</h2><form id="password-form">
      <input id="password-input" type="password" placeholder="管理员密码" autofocus required/>
      <div class="actions"><button type="button" class="secondary" id="cancel-btn">取消</button>
      <button type="submit" class="primary">确认</button></div></form>
      <script>const{ipcRenderer}=require('electron');
      document.getElementById('cancel-btn').addEventListener('click',()=>ipcRenderer.send('${cancelChannel}'));
      document.getElementById('password-form').addEventListener('submit',(e)=>{e.preventDefault();ipcRenderer.send('${submitChannel}',document.getElementById('password-input').value)});
      </script></body></html>`

    promptWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    promptWindow.once('ready-to-show', () => promptWindow.show())
  })
}

/**
 * 恢复窗口位置和大小
 */
const resetWindowsSizeAndPosition = (title: string): void => {
  const win = getWindowsByTitle(title)
  if (!win) return

  const size = getConfValue(`${title}.size`, WINDOW_DEFAULTS.SIZE, 'window') as [number, number]
  const position = getConfValue(`${title}.position`, WINDOW_DEFAULTS.POSITION, 'window') as [number, number]

  win.setSize(size[0], size[1])
  win.setPosition(position[0], position[1])
}

// ==================== 窗口通信 ====================

export type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}

export const addLog2Vue = (msg: string): void => {
  const logWindow = getWindowsByTitle('日志')
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.webContents.send('log-message', msg)
  } else {
    console.log(msg)
  }
}

export const sendLatestLogToMainWindow = (msg: string): void => {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('latest-log', msg)
  }
}

export const sendInitProgress = (progress: number, message: string): void => {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init-progress', { progress, message })
  }
}

export const sendDownloadProgress = (payload: DownloadProgressPayload): void => {
  sendInitProgress(payload.progress, '正在下载程序:')
}

// ==================== 通知系统 ====================

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  duration: number
  timestamp: number
}

const DEFAULT_NOTIFICATION_DURATION = 10000

const generateNotificationId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const sendNotificationToMainWindow = (data: NotificationData): void => {
  const mainWindow = getMainWindow()
  log.info(`[Notification] 尝试发送通知: ${data.title} - ${data.message}, 主窗口: ${mainWindow ? '存在' : '不存在'}`)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-notification', data)
    log.info('[Notification] 通知已发送到主窗口')
  } else {
    log.warn('[Notification] 主窗口不存在，无法发送通知')
  }
}

/**
 * 显示通知（通用函数）
 */
const showNotification = (
  type: NotificationType,
  title: string,
  message: string,
  duration = DEFAULT_NOTIFICATION_DURATION
): void => {
  sendNotificationToMainWindow({
    id: generateNotificationId(),
    type,
    title,
    message,
    duration,
    timestamp: Date.now()
  })
}

// 导出各类通知函数
export const showUpdateNotification = (version: string, message: string, duration?: number): void =>
  showNotification('success', `软件更新至 v${version}`, message, duration)

export const showInfoNotification = (title: string, message: string, duration?: number): void =>
  showNotification('info', title, message, duration)

export const showSuccessNotification = (title: string, message: string, duration?: number): void =>
  showNotification('success', title, message, duration)

export const showWarningNotification = (title: string, message: string, duration?: number): void =>
  showNotification('warning', title, message, duration)

export const showErrorNotification = (title: string, message: string, duration?: number): void =>
  showNotification('error', title, message, duration)

export { showNotification }
