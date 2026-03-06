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
let cachedMainWindow: BrowserWindow | undefined = undefined
let lastCacheTime = 0
const CACHE_TTL = 1000 // 缓存有效期 1 秒

// ==================== 工具函数 ====================

/**
 * 判断是否为主窗口
 */
const isMainWindow = (name: string): boolean => name === MAIN_WINDOW_NAME

/**
 * 获取主窗口实例
 * 优先通过标题匹配，如果失败则返回第一个非子窗口
 * 使用缓存机制避免频繁遍历所有窗口
 */
export const getMainWindow = (): BrowserWindow | undefined => {
  const now = Date.now()

  // 检查缓存是否有效
  if (cachedMainWindow && !cachedMainWindow.isDestroyed() && (now - lastCacheTime) < CACHE_TTL) {
    return cachedMainWindow
  }

  // 首先尝试通过标题获取
  const windowByTitle = getWindowsByTitle(MAIN_WINDOW_NAME)
  if (windowByTitle && !windowByTitle.isDestroyed()) {
    cachedMainWindow = windowByTitle
    lastCacheTime = now
    return windowByTitle
  }

  // 如果标题匹配失败，尝试找到第一个非子窗口（主窗口通常没有父窗口）
  const allWindows = BrowserWindow.getAllWindows()
  const mainWindow = allWindows.find(win => {
    // 排除已销毁的窗口
    if (win.isDestroyed()) return false
    // 排除有父窗口的子窗口
    if (win.getParentWindow()) return false
    return true
  })

  if (mainWindow) {
    log.debug(`通过父窗口检测找到主窗口，标题: ${mainWindow.getTitle()}`)
  }

  // 更新缓存
  cachedMainWindow = mainWindow
  lastCacheTime = now

  return mainWindow
}

/**
 * 清除主窗口缓存
 * 在窗口关闭或重新创建时调用
 */
export const clearMainWindowCache = (): void => {
  cachedMainWindow = undefined
  lastCacheTime = 0
}

/**
 * 根据窗口名称获取路由
 */
const getWindowRoute = (name: string): string => {
  return WINDOW_ROUTES[name] ?? '/about'
}

/**
 * 获取图标路径
 */
const getIconPath = (): string => {
  const iconFromEnv = import.meta.env.VITE_APP_ICON
  return iconFromEnv
    ? `../../resources/${iconFromEnv}`
    : '../../resources/image/icon.png'
}

/**
 * 简单防抖函数
 */
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 保存窗口尺寸（防抖）
 */
const debouncedSaveSize = debounce((window: BrowserWindow, name: string) => {
  setConfValue(`${name}.size`, window.getSize(), 'window')
}, 500)

/**
 * 保存窗口位置（防抖）
 */
const debouncedSavePosition = debounce((window: BrowserWindow, name: string) => {
  setConfValue(`${name}.position`, window.getPosition(), 'window')
}, 500)

/**
 * 创建窗口配置对象
 */
const createWindowConfig = (
  name: string,
  parent?: BrowserWindow | null
): Electron.BrowserWindowConstructorOptions => {
  const shouldShowMenuBar = isMainWindow(name)
  const defaultIcon = join(__dirname, getIconPath())

  return {
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    show: false,
    autoHideMenuBar: !shouldShowMenuBar,
    resizable: true,
    icon: defaultIcon,
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true,
      partition: shouldShowMenuBar ? 'persist:main' : undefined
    },
    parent: parent || undefined,
    modal: false
  }
}

/**
 * 注册窗口事件监听器
 */
const setupWindowEventListeners = (
  window: BrowserWindow,
  name: string,
  autoShow: boolean
): void => {
  // ready-to-show 事件
  window.once('ready-to-show', () => {
    window.setTitle(name)
    resetWindowsSizeAndPosition(name)

    if (autoShow) {
      window.show()
      log.info(`子窗口 ${name} 已显示`)
    } else {
      log.info(`窗口 ${name} 准备完成，等待外部显示`)
    }

    // 如果是主窗口，在这里创建菜单（第一次尝试）
    if (isMainWindow(name) && !isMenuCreated) {
      log.info('主窗口 ready-to-show 触发，尝试创建菜单（第一次）')
      setImmediate(() => {
        ensureMenuCreated(window)
      })
    }
  })

  // resize 和 move 事件
  window.on('resize', () => {
    debouncedSaveSize(window, name)
  })

  window.on('move', () => {
    debouncedSavePosition(window, name)
  })

  // 窗口关闭时清除缓存
  window.on('closed', () => {
    if (isMainWindow(name)) {
      clearMainWindowCache()
      log.debug('主窗口关闭，清除缓存')
    }
  })
}

/**
 * 创建右键菜单
 */
const createContextMenu = (mainWindow: BrowserWindow) => {
  return Menu.buildFromTemplate([
    {
      label: '刷新',
      accelerator: 'CmdOrCtrl+R',
      click: () => refreshWindow(mainWindow)
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
}

/**
 * 创建主窗口
 */
export const createMainWindow = async () => {
  // 主窗口设置 autoShow=false，由外部控制显示时机
  const mainWindow = await createWindows(MAIN_WINDOW_NAME, null, false)

  if (!mainWindow) {
    log.error('创建主窗口失败')
    return null
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const contextMenu = createContextMenu(mainWindow)

  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
    if (!mainWindow.isDestroyed()) {
      contextMenu.popup({ window: mainWindow })
    }
  })

  return mainWindow
}

/**
 * 确保应用菜单已创建（兼容 mini-electron）
 * 在窗口完全就绪后调用，只执行一次
 */
export const ensureMenuCreated = (mainWindow: BrowserWindow | null) => {
  if (isMenuCreated) {
    log.info('应用菜单已存在，跳过重复创建')
    return
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    log.warn('窗口不可用，无法创建菜单')
    return
  }

  try {
    log.info('开始创建应用菜单...')
    createMenu(mainWindow)
    isMenuCreated = true
    log.info('应用菜单创建成功')
  } catch (error) {
    log.error('创建应用菜单失败:', error)
  }
}

/**
 * 降级方案：通过 JavaScript 设置路由
 */
const setRouteByJavaScript = (window: BrowserWindow, pageUrl: string): void => {
  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.webContents.executeJavaScript(`
        console.log('设置路由:', '${pageUrl}');
        if (window.location.hash !== '#${pageUrl}') {
          window.location.hash = '#${pageUrl}';
        }
      `).catch(e => log.error('设置路由失败:', e))
    }
  }, 500)
}

/**
 * 加载窗口路由
 */
const loadWindowRoute = (window: BrowserWindow, pageUrl: string): void => {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${pageUrl}`)
  } else {
    // 生产环境：先加载文件，然后在页面加载完成后导航
    const htmlPath = join(__dirname, '../renderer/index.html')
    log.info(`加载HTML文件: ${htmlPath}, 目标路由: ${pageUrl}`)

    window.loadFile(htmlPath, { hash: pageUrl }).catch(err => {
      log.error(`加载HTML文件失败: ${err.message}`)
      // 降级方案：先加载文件，再通过JS设置路由
      window.loadFile(htmlPath).then(() => {
        setRouteByJavaScript(window, pageUrl)
      })
    })
  }
}

/**
 * 创建一个普通的窗口
 * @param name 窗口标题
 * @param parent 父窗口
 * @param autoShow 是否自动显示（主窗口设为false，由外部控制显示时机）
 */
export const createWindows = async (
  name: string,
  parent?: BrowserWindow | null,
  autoShow: boolean = true
): Promise<BrowserWindow | undefined> => {
  // 检查是否已存在同名窗口
  const existsWindow = getWindowsByTitle(name)
  if (existsWindow) {
    existsWindow.focus()
    return existsWindow
  }

  // 获取配置并创建窗口
  const config = createWindowConfig(name, parent)
  const targetWindow = new BrowserWindow(config)

  // 设置事件监听器
  setupWindowEventListeners(targetWindow, name, autoShow)

  // 加载路由
  const pageUrl = getWindowRoute(name)
  loadWindowRoute(targetWindow, pageUrl)

  // 开发模式下打开开发者工具
  if (is.dev) {
    targetWindow.webContents.openDevTools()
  }

  return targetWindow
}

/**
 * 根据窗口标题获取实例
 * @param titleName 标题名
 */
export const getWindowsByTitle = (titleName: string): BrowserWindow | undefined => {
  const windows = BrowserWindow.getAllWindows()
  return windows.find(win => win.getTitle() === titleName)
}

/**
 * 刷新窗口
 */
const refreshWindow = (window: BrowserWindow | undefined): void => {
  if (!window || window.isDestroyed()) {
    log.warn('窗口不可用，无法刷新')
    return
  }
  window.webContents.reload()
}

/**
 * 创建菜单点击处理器工厂函数
 * 确保每次点击时都能获取到最新的主窗口实例
 */
const createMenuClickHandler = (
  callback: (mainWindow: BrowserWindow) => void | Promise<void>
) => {
  return () => {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      Promise.resolve(callback(mainWindow)).catch(err => {
        log.error('菜单操作失败:', err)
      })
    } else {
      log.warn('主窗口不可用，无法执行菜单操作')
    }
  }
}

/**
 * 创建文件菜单子菜单
 */
const createFileSubmenu = (): Electron.MenuItemConstructorOptions[] => [
  {
    label: '新建',
    accelerator: 'CmdOrCtrl+N',
    click: () => {
      log.info('新建文件')
    }
  },
  {
    label: '打开',
    accelerator: 'CmdOrCtrl+O',
    click: () => {
      log.info('打开文件')
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

// 创建菜单
export const createMenu = (mainWindow?: BrowserWindow | null): void => {
  // 如果没有传入窗口，则通过标题查找
  if (!mainWindow) {
    mainWindow = getMainWindow()
  }

  if (!mainWindow) {
    log.warn('创建菜单失败: 主窗口不存在')
    return
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: createFileSubmenu()
    },
    {
      label: '浏览器中打开',
      click: createMenuClickHandler(() => {
        openInBrowser()
      })
    },
    {
      label: '刷新',
      accelerator: 'CmdOrCtrl+R',
      click: createMenuClickHandler((win) => {
        refreshWindow(win)
      })
    },
    {
      label: '设置',
      click: createMenuClickHandler(async (win) => {
        await createWindows(WINDOW_NAMES.SETTINGS, win)
      })
    },
    {
      label: '关于',
      click: createMenuClickHandler(async (win) => {
        await createWindows(WINDOW_NAMES.ABOUT, win)
      })
    },
    {
      label: '日志',
      click: createMenuClickHandler(async (win) => {
        await createWindows(WINDOW_NAMES.LOG, win)
      })
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * 在浏览器中打开
 */
function openInBrowser(): void {
  const nodeStart = getConfValue('nodeStart', 'false') as string
  if (nodeStart === 'false') {
    showMessageBox('程序未启动', 'error')
    return
  }

  const finalUrl = getConfValue('finalUrl', '') as string
  if (finalUrl === '') {
    showMessageBox('地址配置错误', 'error')
    return
  }

  const browserType = getConfValue('browserType', 'default', 'settings') as string
  openBrowserWithType(finalUrl, browserType)
}

/**
 * 获取最佳的消息框显示窗口
 * 优先级：设置窗口 > 关于窗口 > 主窗口
 */
const getBestWindowForDialog = (): BrowserWindow | undefined => {
  const windows = [
    getWindowsByTitle(WINDOW_NAMES.SETTINGS),
    getWindowsByTitle(WINDOW_NAMES.ABOUT),
    getMainWindow()
  ]

  return windows.find(win => win && !win.isDestroyed())
}

/**
 * 将应用自定义类型映射到 Electron 原生类型
 */
const mapDialogType = (
  type: 'info' | 'error' | 'warning' | 'success'
): 'info' | 'error' | 'warning' | 'none' => {
  const typeMap: Record<string, 'info' | 'error' | 'warning' | 'none'> = {
    error: 'error',
    warning: 'warning'
  }
  return typeMap[type] ?? 'info'
}

/**
 * 获取对话框标题
 */
const getDialogTitle = (
  type: 'info' | 'error' | 'warning' | 'success'
): string => {
  const titleMap: Record<string, string> = {
    success: '成功',
    error: '错误',
    warning: '警告'
  }
  return titleMap[type] ?? '提示'
}

/**
 * 消息框工具函数
 */
export async function showMessageBox(
  message: string,
  type: 'info' | 'error' | 'warning' | 'success' = 'info'
): Promise<void> {
  const options: Electron.MessageBoxOptions = {
    type: mapDialogType(type),
    title: getDialogTitle(type),
    message: message,
    buttons: ['确定']
  }

  const targetWindow = getBestWindowForDialog()

  if (targetWindow) {
    await dialog.showMessageBox(targetWindow, options)
  } else {
    await dialog.showMessageBox(options)
  }
}

/**
 * 切换开发者工具（需要管理员权限）
 */
const toggleDevToolsWithAuth = async (): Promise<void> => {
  const mainWindow = getMainWindow()
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  if (!mainWindow.webContents.isDevToolsOpened()) {
    const allowed = await verifyAdminAccess()
    if (!allowed) {
      return
    }
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.closeDevTools()
  }
}

/**
 * 验证管理员权限
 */
const verifyAdminAccess = async (): Promise<boolean> => {
  const password = await promptAdminPassword()
  if (password === null) {
    log.info('管理员操作已取消')
    return false
  }

  const ADMIN_PASSWORD = getEnvConf('VITE_ADMIN_PASSWORD')
  if (password !== ADMIN_PASSWORD) {
    await dialog.showMessageBox({
      type: 'error',
      title: '验证失败',
      message: '管理员密码错误，请重试。'
    })
    log.warn('管理员密码校验失败')
    return false
  }

  log.info('管理员身份验证成功')
  return true
}

/**
 * 管理员密码验证窗口 HTML 模板
 */
const ADMIN_PASSWORD_HTML = `
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
          ipcRenderer.send('__CANCEL_CHANNEL__');
        });

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          ipcRenderer.send('__SUBMIT_CHANNEL__', input.value);
        });
      </script>
    </body>
  </html>
`

/**
 * 创建管理员密码验证窗口配置
 */
const createPromptWindowConfig = (
  parent?: BrowserWindow | null
): Electron.BrowserWindowConstructorOptions => ({
  width: 360,
  height: 220,
  parent: parent || undefined,
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

/**
 * 提示用户输入管理员密码
 */
const promptAdminPassword = (): Promise<string | null> => {
  const mainWindow = getMainWindow()
  return new Promise((resolve) => {
    const channelId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const submitChannel = `admin-password:submit:${channelId}`
    const cancelChannel = `admin-password:cancel:${channelId}`
    let resolved = false

    const promptWindow = new BrowserWindow(createPromptWindowConfig(mainWindow))

    // 清理函数
    const cleanup = () => {
      try {
        ipcMain.removeListener(submitChannel, submitHandler)
        ipcMain.removeListener(cancelChannel, cancelHandler)
      } catch (err) {
        log.warn('清理IPC监听器时出错:', err)
      }
      if (!promptWindow.isDestroyed()) {
        promptWindow.close()
      }
    }

    // 提交处理器
    const submitHandler = (_event: any, password: string) => {
      resolved = true
      resolve(password)
      cleanup()
    }

    // 取消处理器
    const cancelHandler = () => {
      resolved = true
      resolve(null)
      cleanup()
    }

    ipcMain.once(submitChannel, submitHandler)
    ipcMain.once(cancelChannel, cancelHandler)

    promptWindow.on('closed', () => {
      if (!resolved) {
        resolve(null)
      }
      cleanup()
    })

    // 使用替换后的 channel 加载 HTML
    const html = ADMIN_PASSWORD_HTML
      .replace('__SUBMIT_CHANNEL__', submitChannel)
      .replace('__CANCEL_CHANNEL__', cancelChannel)

    promptWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    promptWindow.once('ready-to-show', () => {
      promptWindow.show()
    })
  })
}

/**
 * 恢复窗口位置和大小
 */
function resetWindowsSizeAndPosition(title: string): void {
  const window = getWindowsByTitle(title)
  if (!window) {
    return
  }

  const size = getConfValue(`${title}.size`, WINDOW_DEFAULTS.SIZE, 'window') as [number, number]
  const position = getConfValue(`${title}.position`, WINDOW_DEFAULTS.POSITION, 'window') as [number, number]

  window.setSize(size[0], size[1])
  window.setPosition(position[0], position[1])
}

// ==================== 窗口通信 ====================

/**
 * 下载进度数据类型
 */
export type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}

/**
 * 向日志窗口添加日志
 * @param msg 日志消息
 */
export const addLog2Vue = (msg: string): void => {
  const logWindows = getWindowsByTitle('日志')

  if (logWindows && !logWindows.isDestroyed()) {
    logWindows.webContents.send('log-message', msg)
  } else {
    console.log(msg)
  }
}

/**
 * 向主窗口发送最新日志消息
 * @param msg 日志消息
 */
export const sendLatestLogToMainWindow = (msg: string): void => {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('latest-log', msg)
  }
}

/**
 * 发送初始化进度
 * @param progress 进度百分比 (0-100)
 * @param message 进度消息
 */
export const sendInitProgress = (progress: number, message: string): void => {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init-progress', { progress, message })
  }
}

/**
 * 发送下载进度
 * @param payload 下载进度数据
 */
export const sendDownloadProgress = (payload: DownloadProgressPayload): void => {
  sendInitProgress(payload.progress, '正在下载程序:')
}
