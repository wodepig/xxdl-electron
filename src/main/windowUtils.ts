// 窗口和菜单工具类
import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import {getConfValue, setConfValue,getEnvConf} from '../main/conf'
import { openBrowserWithType } from './utils'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'

/**
 * 创建主窗口
 */
export const createMainWindow =async () =>{

  const mainWindow  =await  createWindows(getEnvConf('VITE_APP_EXE_NAME'))
    mainWindow?.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })
    const contextMenu = Menu.buildFromTemplate([
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
    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault()
      if (mainWindow && !mainWindow.isDestroyed()) {
        contextMenu.popup({ window: mainWindow })
      }
    })

  return mainWindow

}

/**
 * 创建一个普通的窗口
 * @param name 窗口标题
 * @param parent 父窗口
 */
export const createWindows =async  (name: string, parent?: BrowserWindow | null) =>{
  const existsWindow = getWindowsByTitle(name)
  if (existsWindow) {
    existsWindow.focus()
    return existsWindow
  }

  let pageUrl = '/about'
  if(name === getEnvConf('VITE_APP_EXE_NAME')){
    pageUrl = '/'
  }
  if (name ==='设置'){
    pageUrl = '/settings'
  }
  if (name ==='版本'){
    pageUrl = '/version'
  }
  if (name ==='日志'){
    pageUrl = '/log'
  }
  const defaultIcon = join(__dirname, getIconPath())
  // 创建新窗口
  let targetWindows = new BrowserWindow({
    width: 1000,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    resizable: true,
    icon:defaultIcon,
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true
    },
    parent: parent || undefined, // 设置父窗口
    modal: false // 非模态窗口
  })

  // 窗口准备好后显示
  targetWindows.once('ready-to-show', () => {
    targetWindows?.setTitle(name)
    resetWindowsSizeAndPosition(name)
    targetWindows?.show()
  })

  // 窗口关闭时清理引用
  targetWindows.on('closed', () => {
    // targetWindows = null
  })
  targetWindows?.on('resize', () => {
    setConfValue(name + '.size', targetWindows?.getSize() || [900, 970],'window')
  })
  targetWindows?.on('move', () => {
    setConfValue(name + '.position', targetWindows?.getPosition() || [745, 210],'window')
  })
  // 加载URL，使用hash路由
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    targetWindows.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${pageUrl}`)
  } else {
    // 生产环境：先加载文件，然后在页面加载完成后导航到 about 页面
    targetWindows.loadFile(join(__dirname, '../renderer/index.html'))
    targetWindows.webContents.once('did-finish-load', () => {
      targetWindows?.webContents.executeJavaScript(`
        if (window.location.hash !== '#${pageUrl}') {
          window.location.hash = '#${pageUrl}'
        }
      `)
    })
  }

  // 开发模式下打开开发者工具
  if (is.dev) {
    targetWindows.webContents.openDevTools()
  }
  return targetWindows

}

// 获取图标
function getIconPath(): string {
  let iconPath = '../../resources/image/icon.png'
  if(import.meta.env.VITE_APP_ICON){
    iconPath= '../../resources/'+ import.meta.env.VITE_APP_ICON
  }
  return iconPath
}

/**
 * 根据窗口标题获取实例
 * @param titleName 标题名
 */
export const getWindowsByTitle = (titleName:string): BrowserWindow | undefined =>{
  // 获取所有打开的窗口
  const windows = BrowserWindow.getAllWindows();
  return windows.find(win => win.getTitle() === titleName);
}
/**
 * 刷新窗口
 * @param window
 */
const refreshWindow = (window: BrowserWindow) => {
  if (!window || window.isDestroyed()) {
    log.warn('窗口不可用，无法刷新')
    return
  }
  window.webContents.reload()
}

// 创建菜单
export const createMenu =(): void => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if(!mainWindow){
    log.warn('创建菜单失败: 主窗口不存在')
     return
  }
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
        refreshWindow(mainWindow)
      }
    },
    {
      label: '设置',
      click: async () => {
        await createWindows('设置',mainWindow)
      }
    },
    {
      label: '关于',
      click: async () => {
        await createWindows('关于',mainWindow)
      }
    },{
      label: '日志',
      click: async () => {
        await createWindows('日志',mainWindow)
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
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

// 消息框工具函数
export async function showMessageBox(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') {
  const dialogType: 'info' | 'error' | 'warning' | 'none' = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'
  const options: Electron.MessageBoxOptions = {
    type: dialogType,
    title: type === 'success' ? '成功' : type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示',
    message: message,
    buttons: ['确定']
  }
  const settingsWindow = getWindowsByTitle('设置')
  const aboutWindow = getWindowsByTitle('关于')
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
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


const toggleDevToolsWithAuth = async () => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
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


const verifyAdminAccess = async (): Promise<boolean> => {
  const password = await promptAdminPassword()
  if (password === null) {
    log.info('管理员操作已取消')
    return false
  }
  // 控制台管理员密码
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

const promptAdminPassword = (): Promise<string | null> => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
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


// 恢复窗口位置和大小
function resetWindowsSizeAndPosition(title:string): void {
  const window =  getWindowsByTitle(title)
  if(!window){
    return
  }
  // const size = windowStore.get('size', [900, 970]) as [number, number]
  const size = getConfValue(title + '.size', [900, 970], 'window') as [number, number]
  const position = getConfValue(title + '.position', [745, 210], 'window') as [number, number]
  // const position = windowStore.get('position', [745, 210]) as [number, number]
  window?.setSize(size[0], size[1])
  window?.setPosition(position[0], position[1])
}
